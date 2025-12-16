const { copyFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");

// 构建时将根目录的public文件复制到admin/public
const rootPublicDir = join(__dirname, "..", "..", "public");
const adminPublicDir = join(__dirname, "..", "public");

if (!existsSync(adminPublicDir)) {
  mkdirSync(adminPublicDir, { recursive: true });
}

const filesToCopy = ["index.html", "projects.html", "project-track.html", "ai-assistant.html", "terms.html"];
filesToCopy.forEach((file) => {
  const src = join(rootPublicDir, file);
  const dest = join(adminPublicDir, file);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`Copied ${file} to admin/public/`);
  } else {
    console.warn(`File not found: ${src}`);
  }
});

console.log("Public files copied successfully!");

