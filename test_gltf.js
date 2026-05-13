const fs = require('fs');
const gltf = JSON.parse(fs.readFileSync('robotic_manipulator/scene.gltf'));
const nodes = gltf.nodes;
const meshes = gltf.meshes;

console.log('Nodes named Cylinder.001:');
nodes.forEach(n => {
    if (n.name && n.name.includes('Cylinder.001')) {
        console.log(n);
    }
});
