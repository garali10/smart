export const mbtiQuestions = [
  {
    text: "At a party, do you:",
    type: "multiple-choice",
    difficulty: 1,
    category: "E-I",
    options: [
      {
        text: "Interact with many, even strangers",
        value: 3,
        dimension: "E-I"
      },
      {
        text: "Interact with a few, known to you",
        value: 1,
        dimension: "E-I"
      },
      {
        text: "Stay in a corner, observing",
        value: -2,
        dimension: "E-I"
      },
      {
        text: "Leave early",
        value: -3,
        dimension: "E-I"
      }
    ]
  },
  {
    text: "When making decisions, you tend to:",
    type: "multiple-choice",
    difficulty: 2,
    category: "T-F",
    options: [
      {
        text: "Focus on logic and objective analysis",
        value: 3,
        dimension: "T-F"
      },
      {
        text: "Consider people's feelings and values",
        value: -3,
        dimension: "T-F"
      },
      {
        text: "Balance both logic and feelings",
        value: 0,
        dimension: "T-F"
      }
    ]
  },
  {
    text: "In your free time, you prefer to:",
    type: "multiple-choice",
    difficulty: 1,
    category: "S-N",
    options: [
      {
        text: "Engage in practical, hands-on activities",
        value: 3,
        dimension: "S-N"
      },
      {
        text: "Explore new ideas and possibilities",
        value: -3,
        dimension: "S-N"
      },
      {
        text: "Mix of both",
        value: 0,
        dimension: "S-N"
      }
    ]
  },
  {
    text: "When working on a project, you:",
    type: "multiple-choice",
    difficulty: 2,
    category: "J-P",
    options: [
      {
        text: "Prefer to plan and follow a schedule",
        value: 3,
        dimension: "J-P"
      },
      {
        text: "Like to keep options open and be flexible",
        value: -3,
        dimension: "J-P"
      },
      {
        text: "Adapt based on the situation",
        value: 0,
        dimension: "J-P"
      }
    ]
  },
  {
    text: "Rate your preference for routine vs. spontaneity (1-7):",
    type: "scale",
    difficulty: 3,
    category: "J-P",
    options: [
      {
        text: "1 - Strongly prefer routine",
        value: 3,
        dimension: "J-P"
      },
      {
        text: "4 - Balanced",
        value: 0,
        dimension: "J-P"
      },
      {
        text: "7 - Strongly prefer spontaneity",
        value: -3,
        dimension: "J-P"
      }
    ]
  }
]; 