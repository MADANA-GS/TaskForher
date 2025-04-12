import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
    }
  },
  tasks: [{
    id: {
      type: String,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    time: {
      type: String,
      validate: {
        validator: function(v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: props => `${props.value} is not a valid time format! Use HH:MM`
      }
    },
    endTime: {
      type: String,
      validate: {
        validator: function(v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: props => `${props.value} is not a valid time format! Use HH:MM`
      }
    }
  }]
}, { timestamps: true });

// Compound index for efficient queries
taskSchema.index({ date: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;