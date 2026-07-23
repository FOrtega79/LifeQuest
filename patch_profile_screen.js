import fs from 'fs';
let code = fs.readFileSync('src/screens/ProfileScreen.tsx', 'utf8');
const searchStr = "  const [showAllTransactions, setShowAllTransactions] = useState(false);";
if (code.includes(searchStr)) {
    code = code.replace(searchStr, searchStr + "\n  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');\n  const { quests } = useGame();");
    fs.writeFileSync('src/screens/ProfileScreen.tsx', code);
    console.log("Patched states");
}
