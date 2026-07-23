import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<button[\s\n]*onClick=\{\(\) => handleTabChange\('profile'\)\}[\s\S]*?<\/button>/;

if (regex.test(code)) {
    code = code.replace(regex, '');
    fs.writeFileSync('src/App.tsx', code);
    console.log("Patched App.tsx navigation");
} else {
    console.log("Not found");
}
