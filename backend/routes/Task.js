import express from 'express';
import Task from '../models/taskSchema.js';

const taskRouter = express.Router();

// Get tasks for a specific month
taskRouter.get('/', async (req, res) => {
  const { month } = req.query;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
  }

  try {
    const dateRegex = new RegExp(`^${month}`);
    const tasks = await Task.find({ date: dateRegex });

    const taskMap = {};
    tasks.forEach(item => {
      taskMap[item.date] = item.tasks;
    });

    res.json(taskMap);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

// Create or update all tasks for a specific date
taskRouter.post('/', async (req, res) => {
  const { date, tasks } = req.body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Tasks must be an array' });
  }

  try {
    // Using findOneAndUpdate with upsert: true to create if not exists
    const result = await Task.findOneAndUpdate(
      { date },
      { date, tasks },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Error updating tasks:', err);
    res.status(500).json({ error: 'Failed to update tasks' });
  }
});

// Patch a single task for a specific date
taskRouter.patch('/:date/:taskId', async (req, res) => {
  const { date, taskId } = req.params;
  const { completed } = req.body;

  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'Completed status must be a boolean' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }

  try {
    let taskDoc = await Task.findOne({ date });

    if (!taskDoc) {
      // If the document doesn't exist yet, create it with predefined tasks
      // You would need to import the PREDEFINED_TASKS from a shared config
      // For now, we'll just create an empty tasks array and add the current task
      taskDoc = new Task({
        date,
        tasks: [{ id: taskId, completed }]
      });
    } else {
      // If document exists, find the specific task
      const taskIndex = taskDoc.tasks.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        // Task doesn't exist in the document, add it
        taskDoc.tasks.push({ id: taskId, completed });
      } else {
        // Task exists, update its completed status
        taskDoc.tasks[taskIndex].completed = completed;
      }
    }

    await taskDoc.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task for a specific date
taskRouter.delete('/:date/:taskId', async (req, res) => {
  const { date, taskId } = req.params;

  try {
    const taskDoc = await Task.findOne({ date });

    if (!taskDoc) {
      return res.status(404).json({ error: 'Date not found' });
    }

    taskDoc.tasks = taskDoc.tasks.filter(t => t.id !== taskId);
    await taskDoc.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default taskRouter;