/** Default values for the `settings` table. Admins change them in the CMS; the seed never overwrites them. */
export const DEFAULT_SETTINGS = {
  rewards: {
    correctAnswerXp: 5,
    lessonXp: 20,
    perfectLessonBonusXp: 30,
    dailyMissionXp: 50,
    lessonCoins: 5,
    perfectLessonBonusCoins: 5,
    gameCoinsPerCorrect: 1,
    starThresholds: [60, 80, 95],
  },
  levels: { xpPerLevelStep: 100 },
  hearts: { max: 5, refillMinutes: 30 },
  review: { maxItemsPerLesson: 3 },
  dailyGoal: { minutes: 10 },
} as const;
