const fs = require('fs');
const content = fs.readFileSync('src/components/QuestCard.tsx', 'utf8');

const injection = `
  const [reminderRemaining, setReminderRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!activeReminder) {
      setReminderRemaining(null);
      return;
    }
    const updateReminder = () => {
       const remaining = Math.max(0, activeReminder.targetTime - Date.now());
       const total = activeReminder.targetTime - activeReminder.startTime;
       if (remaining <= 0) setReminderRemaining(null);
       else setReminderRemaining(remaining / total); // 0 to 1
    }
    updateReminder();
    const int = setInterval(updateReminder, 1000);
    return () => clearInterval(int);
  }, [activeReminder]);
`;

const newContent = content.replace(
  "const [expired, setExpired] = useState(false);",
  "const [expired, setExpired] = useState(false);\n" + injection
);

fs.writeFileSync('src/components/QuestCard.tsx', newContent);
