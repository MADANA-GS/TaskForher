import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isToday,
  isSameDay,
  parseISO,
  isSameMonth,
  isFuture,
  getDay,
} from "date-fns";

const API_BASE = "https://taskforher.onrender.com";

// Predefined tasks remain the same
const PREDEFINED_TASKS = [
  {
    id: "water_morning",
    title: "Drink water right after waking up",
    time: "07:00",
    endTime: "07:30",
    type: "hydration",
    icon: "💧",
    message: "Hey love, time to hydrate that cute body of yours 😘",
  },
  {
    id: "stretch",
    title: "Do light morning stretches",
    time: "07:30",
    endTime: "08:00",
    type: "exercise",
    icon: "🧘‍♀️",
    message: "Let's loosen up those pretty limbs 🌞 You're my yoga queen 😍",
  },
  {
    id: "breakfast",
    title: "Have a healthy breakfast",
    time: "08:00",
    endTime: "09:00",
    type: "nutrition",
    icon: "🥣",
    message: "Feed that gorgeous soul and body — you're glowing already 🌸✨",
  },
  {
    id: "churu_love",
    title: "Talk one hour with your handsome boyfriend 😁😁",
    time: "18:00",
    endTime: "19:00",
    type: "love",
    icon: "💗",
    message:
      "Let's get smarter together, baby. You're going to ace everything! 😘📖",
  },
  {
    id: "water_afternoon",
    title: "Drink a glass of water",
    time: "13:00",
    endTime: "13:15",
    type: "hydration",
    icon: "🚰",
    message: "Midday hydration reminder from your no.1 fan 😘",
  },
  {
    id: "walk",
    title: "Take a short walk",
    time: "17:30",
    endTime: "18:00",
    type: "exercise",
    icon: "🚶‍♀️",
    message: "Take those dreamy steps, queen 💃 The world deserves to see you!",
  },
  {
    id: "water_evening",
    title: "Drink water in the evening",
    time: "19:00",
    endTime: "19:15",
    type: "hydration",
    icon: "🫗",
    message:
      "One more sip for that perfect glow ✨ You're too pretty to be dehydrated 😘",
  },
  {
    id: "study",
    title: "Study for 1 hour",
    time: "19:30",
    endTime: "21:00",
    type: "learning",
    icon: "📚",
    message:
      "Let's get smarter together, baby. You're going to ace everything! 😘📖",
  },
  {
    id: "sleep_prep",
    title: "Wind down & prepare for sleep",
    time: "21:30",
    endTime: "22:00",
    type: "rest",
    icon: "🛌",
    message:
      "Wrap up the day, love 💫 You deserve all the peace and sweet dreams 💖",
  },
  {
    id: "goodnight_chinni",
    title: "Sleep with me babe",
    time: "22:30",
    endTime: "23:30",
    type: "rest",
    icon: "🛌",
    message: "Cuddle mode activated 🥰 Close your eyes and dream of us 💖",
  },
];
// More subdued color palette
const TYPE_COLORS = {
  hydration: {
    bg: "bg-blue-700",
    border: "border-blue-600",
    text: "text-blue-100",
    completed: "bg-blue-800",
  },
  nutrition: {
    bg: "bg-amber-700",
    border: "border-amber-600",
    text: "text-amber-100",
    completed: "bg-amber-800",
  },
  exercise: {
    bg: "bg-green-700",
    border: "border-green-600",
    text: "text-green-100",
    completed: "bg-green-800",
  },
  learning: {
    bg: "bg-purple-700",
    border: "border-purple-600",
    text: "text-purple-100",
    completed: "bg-purple-800",
  },
  love: {
    bg: "bg-rose-700",
    border: "border-rose-600",
    text: "text-rose-100",
    completed: "bg-rose-800",
  },
  rest: {
    bg: "bg-indigo-700",
    border: "border-indigo-600",
    text: "text-indigo-100",
    completed: "bg-indigo-800",
  },
  default: {
    bg: "bg-gray-700",
    border: "border-gray-600",
    text: "text-gray-100",
    completed: "bg-gray-800",
  },
};

// Function to generate random streak points between 1 and 5
const generateStreakPoints = () => {
  return Math.floor(Math.random() * 5) + 1;
};

// Format time to 12-hour format
const formatTo12Hour = (timeStr) => {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

// Sort tasks by time
const sortTasksByTime = (tasks) => {
  return [...tasks].sort((a, b) => {
    const timeA = a.time.split(":").map(Number);
    const timeB = b.time.split(":").map(Number);
    return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
  });
};

// Calendar color scheme - more subdued
const COLOR_CLASSES = [
  {
    count: 0,
    class: "bg-gray-600 text-gray-200 border border-gray-500",
    label: "No tasks",
  },
  {
    count: 1,
    class: "bg-blue-600 text-gray-100 border border-blue-500",
    label: "1 task",
  },
  {
    count: 2,
    class: "bg-blue-700 text-gray-100 border border-blue-600",
    label: "2 tasks",
  },
  {
    count: 3,
    class: "bg-blue-800 text-gray-100 border border-blue-700",
    label: "3 tasks",
  },
  {
    count: 4,
    class: "bg-blue-900 text-gray-100 border border-blue-800",
    label: "4-5 tasks",
  },
  {
    count: 6,
    class: "bg-indigo-900 text-gray-100 border border-indigo-800",
    label: "6+ tasks",
  },
];

const getColorClass = (count) => {
  if (count === 0) return COLOR_CLASSES[0].class;
  if (count === 1) return COLOR_CLASSES[1].class;
  if (count === 2) return COLOR_CLASSES[2].class;
  if (count === 3) return COLOR_CLASSES[3].class;
  if (count <= 5) return COLOR_CLASSES[4].class;
  return COLOR_CLASSES[5].class;
};

const Hero = () => {
  const [tasksMap, setTasksMap] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Fixed date setting for April 2025
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalTasks, setModalTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [streakPoints, setStreakPoints] = useState(0);
  const [lastCompletedTask, setLastCompletedTask] = useState(null);
  // Add state to track tasks that are being processed
  const [processingTasks, setProcessingTasks] = useState({});
  // Add a state to track which toasts have been shown
  const [shownToasts, setShownToasts] = useState({});

  const today = new Date(); 

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const isEditable = (dateStr) => isSameDay(parseISO(dateStr), today);
  const isFutureDate = (dateStr) => isFuture(parseISO(dateStr));
  const isPastDate = (dateStr) =>
    !isSameDay(parseISO(dateStr), today) && !isFuture(parseISO(dateStr));

  // Get task time status: "past", "current", or "future"
  const getTaskTimeStatus = (task, dateStr) => {
    // For past dates (not today), all tasks are in the past
    if (isPastDate(dateStr)) return "past";

    // For future dates, all tasks are in the future
    if (isFutureDate(dateStr)) return "future";

    // For today's date, check the current time against task start and end times
    if (!task.time || !task.endTime) return "current";

    const [startHour, startMin] = task.time.split(":").map(Number);
    const [endHour, endMin] = task.endTime.split(":").map(Number);

    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();

    // Convert all to minutes for easier comparison
    const startTimeInMinutes = startHour * 60 + startMin;
    const endTimeInMinutes = endHour * 60 + endMin;
    const currentTimeInMinutes = currentHour * 60 + currentMin;

    if (currentTimeInMinutes < startTimeInMinutes) return "future";
    if (currentTimeInMinutes >= endTimeInMinutes) return "past";
    return "current";
  };

  // Check if task can be toggled based on time
  const canToggleTask = (task, dateStr) => {
    if (!isEditable(dateStr)) return false;
    return getTaskTimeStatus(task, dateStr) === "current";
  };

  // Update streak points when completing a task
  const updateStreakPoints = async (task) => {
    try {
      // Create a unique task identifier
      const taskKey = `${task.id}-${new Date().toISOString().split("T")[0]}`;

      // Check if we already showed a toast for this task today
      if (shownToasts[taskKey]) {
        return; // Skip processing this task - toast already shown
      }

      // Mark this task as having shown a toast
      setShownToasts((prev) => ({
        ...prev,
        [taskKey]: true,
      }));

      // Generate random points for this task completion
      const points = generateStreakPoints();

      // Calculate new streak points total
      const newStreakPoints = streakPoints + points;
      setStreakPoints(newStreakPoints);

      // ONLY show toast for streak points once
      toast.success(`+${points} streak points! 🔥`, {
        position: "top-right",
        autoClose: 1000, // Set to 1 second as requested
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        // Add a unique toastId to prevent duplicates
        toastId: taskKey,
      });

      // Update streak points on the server
      await axios.post(`${API_BASE}/api/streak/add`, { number: points });

      // Wait a moment to give visual feedback before removing from processing state
      setTimeout(() => {
        setProcessingTasks((prev) => {
          const updated = { ...prev };
          delete updated[task.id];
          return updated;
        });
      }, 1500);
    } catch (err) {
      console.error("Failed to update streak points:", err);

      // Remove from processing state in case of error (no toast for error)
      setProcessingTasks((prev) => {
        const updated = { ...prev };
        delete updated[task.id];
        return updated;
      });
    }
  };

  const fetchMonthTasks = async () => {
    setIsLoading(true);
    try {
      const monthStr = format(currentMonth, "yyyy-MM");
      const res = await axios.get(`${API_BASE}/api/tasks?month=${monthStr}`);
      const data = res.data;

      const taskObj = {};

      // First, initialize all days in the month with predefined tasks
      const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      });

      daysInMonth.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        // Sort tasks by time when initializing
        taskObj[dateStr] = sortTasksByTime(
          PREDEFINED_TASKS.map((t) => ({ ...t, completed: false }))
        );
      });

      // Then update with any saved task data
      for (const [date, tasks] of Object.entries(data)) {
        if (taskObj[date]) {
          taskObj[date] = sortTasksByTime(
            PREDEFINED_TASKS.map((t) => {
              const saved = tasks.find((s) => s.id === t.id);
              return saved
                ? { ...t, completed: saved.completed }
                : { ...t, completed: false };
            })
          );
        }
      }

      setTasksMap(taskObj);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch tasks.");
      // No toast for error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthTasks();

    // Fetch current streak points on load
    axios
      .get(`${API_BASE}/api/streak`)
      .then((res) => {
        if (res.data && typeof res.data.streakPoints === "number") {
          setStreakPoints(res.data.streakPoints);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch streak points:", err);
      });
  }, [currentMonth]);

  const openDayModal = (day) => {
    const dateStr = format(day, "yyyy-MM-dd");

    // Don't open modal for future dates
    if (isFutureDate(dateStr)) {
      setError("Future dates cannot be accessed yet.");
      // No toast for this error
      return;
    }

    setSelectedDay({ date: dateStr });

    let dayTasks =
      tasksMap[dateStr] ||
      sortTasksByTime(
        PREDEFINED_TASKS.map((task) => ({
          ...task,
          completed: false,
        }))
      );

    // Ensure tasks are sorted by time
    dayTasks = sortTasksByTime(dayTasks);
    setModalTasks(dayTasks);
  };

  const toggleTask = async (index) => {
    if (!selectedDay) return;
    const dateStr = selectedDay.date;
    const task = modalTasks[index];

    // Don't allow toggle if task is already being processed
    if (processingTasks[task.id]) {
      return;
    }

    if (!canToggleTask(task, dateStr)) {
      // No toast warning for this condition
      return;
    }

    // Don't allow toggling completed tasks back to uncompleted
    if (task.completed) {
      // No toast info for this condition
      return;
    }

    // Mark task as being processed
    setProcessingTasks((prev) => ({
      ...prev,
      [task.id]: true,
    }));

    const updatedTasks = [...modalTasks];
    updatedTasks[index].completed = true; // Only allow completing tasks, not uncompleting

    setModalTasks(updatedTasks);
    setTasksMap((prev) => ({ ...prev, [dateStr]: updatedTasks }));

    try {
      // Update single task
      await axios.patch(`${API_BASE}/api/tasks/${dateStr}/${task.id}`, {
        completed: true,
      });

      // Update streak points including task message
      await updateStreakPoints(task);
    } catch (err) {
      console.error(err);
      // No toast for error

      // Reset UI state in case of error
      updatedTasks[index].completed = false;
      setModalTasks([...updatedTasks]);
      setTasksMap((prev) => ({ ...prev, [dateStr]: [...updatedTasks] }));

      // Remove from processing state
      setProcessingTasks((prev) => {
        const updated = { ...prev };
        delete updated[task.id];
        return updated;
      });
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Calculate blank spaces for the calendar
  const blanks = Array.from(
    { length: getDay(startOfMonth(currentMonth)) },
    (_, i) => i
  );

  // Check if we're viewing the current month
  const isCurrentMonth = isSameMonth(currentMonth, today);

  // Helper function to determine task status display
  const getTaskStatus = (task, dateStr) => {
    // If task is processing, show that first
    if (processingTasks[task.id]) {
      return {
        text: "Processing...",
        style: "bg-yellow-800 text-yellow-200",
      };
    }

    // If task is completed, always show it as completed regardless of time
    if (task.completed) {
      return {
        text: "Completed",
        style: "bg-green-900 text-green-200",
      };
    }

    // Otherwise, show status based on time
    const timeStatus = getTaskTimeStatus(task, dateStr);

    if (timeStatus === "past") {
      return {
        text: "Time over",
        style: "bg-gray-600 text-gray-300",
      };
    }

    if (timeStatus === "future") {
      return {
        text: "Coming up",
        style: "bg-blue-900 text-blue-200",
      };
    }

    // Current and not completed
    return {
      text: "Available now ✨",
      style: "bg-amber-900 text-amber-200 font-bold",
    };
  };

  // Helper function for time info display
  const getTimeInfoDisplay = (task, dateStr) => {
    // If task is completed, show a completed message with time range
    if (task.completed) {
      return `Completed (${formatTo12Hour(task.time)} - ${formatTo12Hour(
        task.endTime
      )})`;
    }

    // Otherwise use the existing logic
    const timeStatus = getTaskTimeStatus(task, dateStr);

    if (timeStatus === "past") {
      return `Time over (${formatTo12Hour(task.time)} - ${formatTo12Hour(
        task.endTime
      )})`;
    }

    if (timeStatus === "future") {
      return `Coming up at ${formatTo12Hour(task.time)}`;
    }

    return `Available until ${formatTo12Hour(task.endTime)}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto py-5 font-sans bg-gray-800 rounded-lg shadow-lg">
      <ToastContainer
        position="top-right"
        autoClose={1000} // Set to 1 second as requested
        hideProgressBar={false}
        newestOnTop
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark" // Added dark theme for better UI in dark mode
        limit={3}
        closeButton={true} // Explicitly set closeButton to true
      />

      {error && (
        <div className="bg-red-900 p-3 rounded-md mb-4 text-red-100 flex justify-between items-center border border-red-800">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-200 hover:text-red-100"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="px-4 py-2 bg-blue-800 text-gray-100 rounded-md hover:bg-blue-700 flex items-center transition-colors"
        >
          <span className="mr-1">◀</span> Prev
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold text-gray-100">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          {/* <div className="text-sm text-amber-300 font-medium">
            Streak Points: {streakPoints} 🔥
          </div> */}
        </div>
        {!isCurrentMonth && (
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="px-4 py-2 bg-blue-800 text-gray-100 rounded-md hover:bg-blue-700 flex items-center transition-colors"
          >
            Next <span className="ml-1">▶</span>
          </button>
        )}
        {isCurrentMonth && <div className="w-24"></div>}{" "}
        {/* Spacer to maintain layout */}
      </div>

      {/* Color palette legend */}
      <div className="mb-4 bg-gray-700 p-4 rounded-md shadow-sm border border-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-200 mb-2 font-medium">
              Calendar Legend:
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_CLASSES.map((color, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className={`w-4 h-4 ${
                      color.class.split(" ")[0]
                    } rounded mr-1`}
                  ></div>
                  <span className="text-xs text-gray-300">{color.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-200 mb-2 font-medium">
              Task Types:
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TYPE_COLORS)
                .filter(([key]) => key !== "default")
                .map(([type, colors]) => (
                  <div key={type} className="flex items-center">
                    <div className={`w-4 h-4 ${colors.bg} rounded mr-1`}></div>
                    <span className="text-xs text-gray-300 capitalize">
                      {type}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8 text-blue-400">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading calendar data...
        </div>
      ) : (
        <div className="bg-gray-700 rounded-lg shadow border border-gray-600">
          {/* Day header row */}
          <div className="grid grid-cols-7 gap-2 text-center bg-gray-800 py-2 border-b border-gray-600 rounded-t-lg">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-sm font-medium text-gray-200">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid with correct alignment */}
          <div className="grid grid-cols-7 gap-2 p-2">
            {/* Empty cells for proper alignment */}
            {blanks.map((blank, i) => (
              <div key={`blank-${i}`} className="aspect-square p-1"></div>
            ))}

            {/* Actual calendar days */}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const completedCount = (tasksMap[dateStr] || []).filter(
                (t) => t.completed
              ).length;
              const isCurrentDay = isToday(day);
              const isFuture = isFutureDate(dateStr);

              // Check if there are any current tasks
              const hasCurrentTasks =
                isCurrentDay &&
                (tasksMap[dateStr] || []).some(
                  (t) =>
                    getTaskTimeStatus(t, dateStr) === "current" && !t.completed
                );

              return (
                <div
                  key={dateStr}
                  className={`aspect-square p-1 rounded-md cursor-pointer flex items-center justify-center 
                    ${getColorClass(completedCount)} 
                    ${isCurrentDay ? "ring-2 ring-blue-400" : ""} 
                    ${
                      isFuture
                        ? "bg-gray-600 cursor-not-allowed opacity-60"
                        : ""
                    } 
                    ${hasCurrentTasks ? "animate-pulse" : ""}
                    transition-all shadow-sm`}
                  onClick={() => openDayModal(day)}
                >
                  <span
                    className={
                      isFuture
                        ? "text-gray-400 font-medium"
                        : "font-medium text-gray-100"
                    }
                  >
                    {format(day, "d")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-800 p-4 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl border border-gray-700">
            <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
              <h2 className="text-xl font-semibold text-gray-100">
                {format(parseISO(selectedDay.date), "EEEE, MMMM do, yyyy")}
              </h2>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-300 hover:text-gray-100 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {modalTasks.map((task, i) => {
                const timeStatus = getTaskTimeStatus(task, selectedDay.date);
                const canEdit = canToggleTask(task, selectedDay.date);
                const typeColors =
                  TYPE_COLORS[task.type?.toLowerCase()] || TYPE_COLORS.default;

                // Get task status display info using the helper function
                const taskStatus = getTaskStatus(task, selectedDay.date);

                // Determine if we should add pulse animation
                const isCurrentTask =
                  timeStatus === "current" && !task.completed;

                // Check if task is being processed
                const isProcessing = processingTasks[task.id];

                return (
                  <div
                    key={task.id}
                    className={`bg-gray-700 p-3 rounded-md shadow-sm border border-gray-600 
                    ${isCurrentTask && !isProcessing ? "animate-pulse" : ""}
                    ${isProcessing ? "opacity-80" : ""}`}
                  >
                    <div className="flex items-start">
                      {/* Icon column */}
                      <div className="mr-3 text-lg pt-1" aria-hidden="true">
                        <span>{task.icon}</span>
                      </div>

                      {/* Content column */}
                      <div className="flex-1">
                        <div className="font-medium text-gray-100">
                          {task.title}
                        </div>

                        {/* Time display row */}
                        <div className="flex justify-between items-center mt-1">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-300">
                              {formatTo12Hour(task.time)}
                            </span>
                          </div>

                          {/* Status indicator - Now using the helper function */}
                          {/* Status indicator - Now using the helper function */}
                          <div
                            className={`text-xs px-2 py-1 ${
                              taskStatus.style
                            } rounded ${
                              isCurrentTask && !isProcessing
                                ? "ring-1 ring-amber-500"
                                : ""
                            }`}
                          >
                            {taskStatus.text}
                          </div>
                        </div>

                        {/* Additional time info - Using the helper function */}
                        <div className="text-xs text-gray-400 mt-1">
                          {getTimeInfoDisplay(task, selectedDay.date)}
                        </div>
                      </div>

                      {/* Checkbox for current tasks - now disabled after completion or during processing */}
                      {canEdit && timeStatus === "current" && (
                        <div className="ml-2 flex items-center">
                          <input
                            type="checkbox"
                            checked={task.completed || false}
                            onChange={() => toggleTask(i)}
                            disabled={task.completed || isProcessing}
                            className={`w-5 h-5 ${
                              task.completed || isProcessing
                                ? "accent-gray-500 cursor-not-allowed"
                                : "accent-blue-600 cursor-pointer"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 mt-3 border-t border-gray-700">
              <button
                onClick={() => setSelectedDay(null)}
                className="w-full bg-blue-700 text-gray-100 py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hero;
