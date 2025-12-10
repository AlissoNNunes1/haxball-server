const fs=require('fs');
const s=fs.readFileSync('src/ControlPanel.ts','utf8');
const lines=s.split('\n');
const stack=[];
for (let i=0;i<lines.length;i++){
  const ln=lines[i];
  for(let j=0;j<ln.length;j++){
    const ch=ln[j];
    if(ch=='{') stack.push({line:i+1,col:j+1,ctx:ln.slice(0,80)});
    if(ch=='}') stack.pop();
  }
}
if(stack.length>0){
  console.log('Unmatched open braces: ');
  stack.forEach(e=>console.log(`line ${e.line} col ${e.col} -> ${e.ctx}`));
}else{
  console.log('All matched');
}
