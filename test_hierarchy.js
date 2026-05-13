const fs = require('fs');
const gltf = JSON.parse(fs.readFileSync('robotic_manipulator/scene.gltf'));
const nodes = gltf.nodes;

let upperArmIdx = -1;
nodes.forEach((n, idx) => {
    if (n.name && (n.name === 'arm' || n.name === 'part.04')) {
        console.log('Found ' + n.name + ' at index ' + idx);
        if(n.name==='arm') upperArmIdx = idx;
    }
});

function findChildren(idx, depth) {
    let node = nodes[idx];
    if(node.children) {
        node.children.forEach(c => {
            console.log(' '.repeat(depth*2) + nodes[c].name);
            findChildren(c, depth+1);
        });
    }
}
if(upperArmIdx !== -1) {
    console.log('Children of arm:');
    findChildren(upperArmIdx, 1);
}
