import Assignment from '../models/Assignment.js';
import { assignmentQueue } from '../queues/assignmentQueue.js';

/**
 * POST /api/assignments/generate
 * Creates an assignment record, enqueues the generation job.
 */
export async function createAssignment(req, res) {
  try {
    const userId = req.user._id;
    let {
      title,
      subject,
      difficulty = 'medium',
      timeLimit = 60,
      dueDate,
      questionRows = '[]',
      additionalInfo = '',
    } = req.body;

    if (typeof questionRows === 'string') {
      try {
        questionRows = JSON.parse(questionRows);
      } catch (e) {
        questionRows = [];
      }
    }

    const files = req.files ? (req.files as any[]).map(f => ({
      path: f.path,
      mimetype: f.mimetype,
      originalname: f.originalname
    })) : [];

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Assignment title is required' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, error: 'Subject is required' });
    }
    if (!questionRows.length) {
      return res.status(400).json({ success: false, error: 'At least one question row is required' });
    }
    for (const row of questionRows) {
      if (!row.count || row.count < 1) {
        return res.status(400).json({ success: false, error: 'Question count must be at least 1' });
      }
      if (!row.marks || row.marks < 1) {
        return res.status(400).json({ success: false, error: 'Marks must be at least 1' });
      }
    }

    const totalMarksEstimate = questionRows.reduce((s, r) => s + r.count * r.marks, 0);
    const totalQuestionsEstimate = questionRows.reduce((s, r) => s + r.count, 0);

    // Create assignment in DB with status 'pending'
    const assignment = await Assignment.create({
      userId,
      title: title.trim(),
      subject: subject.trim(),
      difficulty,
      timeLimit,
      dueDate: dueDate || null,
      questionRows,
      additionalInfo,
      totalMarks: totalMarksEstimate,
      totalQuestions: totalQuestionsEstimate,
      status: 'pending',
    });

    // Enqueue generation job
    const job = await assignmentQueue.add(
      'generate',
      {
        assignmentId: assignment._id.toString(),
        userId: userId.toString(),
        config: { title, subject, difficulty, timeLimit, questionRows, additionalInfo, files },
      },
      { jobId: `assignment-${assignment._id}` }
    );

    // Save jobId
    assignment.jobId = job.id;
    await assignment.save();

    return res.status(201).json({
      success: true,
      data: {
        assignmentId: assignment._id,
        jobId: job.id,
        status: 'pending',
        message: 'Generation started. Listen to WebSocket for progress updates.',
      },
    });
  } catch (err) {
    console.error('createAssignment error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/assignments/:id
 * Fetch a completed assignment by ID.
 */
export async function getAssignment(req, res) {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const assignment = await Assignment.findOne({ _id: id, userId }).lean();
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    return res.json({ success: true, data: assignment });
  } catch (err) {
    console.error('getAssignment error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/assignments
 * List all assignments for the logged-in user.
 */
export async function listAssignments(req, res) {
  try {
    const userId = req.user._id;
    const assignments = await Assignment.find({ userId })
      .sort({ createdAt: -1 })
      .select('title subject difficulty status totalMarks totalQuestions createdAt dueDate')
      .lean();

    return res.json({ success: true, data: assignments });
  } catch (err) {
    console.error('listAssignments error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * DELETE /api/assignments/:id
 */
export async function deleteAssignment(req, res) {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const result = await Assignment.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    return res.json({ success: true, message: 'Assignment deleted' });
  } catch (err) {
    console.error('deleteAssignment error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * PUT /api/assignments/:id
 * Update an existing assignment.
 */
export async function updateAssignment(req, res) {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { title, subject, difficulty, timeLimit, totalMarks, totalQuestions, sections, dueDate } = req.body;

    const assignment = await Assignment.findOneAndUpdate(
      { _id: id, userId },
      { title, subject, difficulty, timeLimit, totalMarks, totalQuestions, sections, dueDate },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found or unauthorized' });
    }

    return res.json({ success: true, data: assignment });
  } catch (err) {
    console.error('updateAssignment error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
