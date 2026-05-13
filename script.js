// ============================================
// THREE.JS ROBOTIC ARM INTERACTIVE EXPERIENCE
// ============================================

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

// ============================================
// 1. SCENE SETUP
// ============================================

const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();

// Background color (optional, canvas background takes precedence)
scene.background = new THREE.Color(0x050505);

console.log('✓ Scene created');

// ============================================
// 2. CAMERA SETUP
// ============================================

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

const camera = new THREE.PerspectiveCamera(
    45,  // Field of view
    sizes.width / sizes.height,  // Aspect ratio
    0.1,  // Near clipping plane
    100   // Far clipping plane
);

camera.position.set(0, 0, 15);  // Position camera at (0, 0, 15)
scene.add(camera);

console.log('✓ Camera setup complete');

// ============================================
// 3. LIGHTING SETUP
// ============================================

// Ambient Light (Fill light - uniform illumination)
const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);

// Hemisphere Light (Boosts overall lighting, especially from sky/ground)
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
hemisphereLight.position.set(0, 20, 0);
scene.add(hemisphereLight);

// Directional Light (Key light - defines main shadows/highlights)
const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Point Light (Rim light - cool sci-fi accent)
const pointLight = new THREE.PointLight(0x88ccff, 3.0);
pointLight.position.set(-5, 3, -5);
scene.add(pointLight);

console.log('✓ Lighting setup complete');

// ============================================
// 4. MODEL LOADING
// ============================================

let robotArm = null;

// References to the kinematic parts
let baseJoint = null;
let part05 = null;
let part04 = null;
let part03 = null;
let upperArm = null;

// Initial rotations to act as rest pose
let part05RotY = 0;
let part04RotX = 0;
let part03RotX = 0;

const gltfLoader = new GLTFLoader();

gltfLoader.load(
    'robotic_manipulator/scene.gltf',  // Model path relative to index.html
    (gltf) => {
        robotArm = gltf.scene;
        
        // Find the parts using the exact GLTF node names
        baseJoint = robotArm.getObjectByName('Base');
        part05 = robotArm.getObjectByName('part05') || robotArm.getObjectByName('part.05');
        part04 = robotArm.getObjectByName('part04') || robotArm.getObjectByName('part.04');
        part03 = robotArm.getObjectByName('part03') || robotArm.getObjectByName('part.03');
        upperArm = robotArm.getObjectByName('arm');
        
        if (baseJoint && part05 && part04 && part03 && upperArm) {
            // Re-parent to create a kinematic chain: Base -> part05 -> part04 -> part03 -> upperArm
            // Object3D.attach() preserves the world transform while reparenting
            baseJoint.attach(part05);
            part05.attach(part04);
            part04.attach(part03);
            part03.attach(upperArm);
            
            // Store initial local rotations for clamping limits relative to the rest pose
            part05RotY = part05.rotation.y;
            part04RotX = part04.rotation.x;
            part03RotX = part03.rotation.x;
            
            console.log('✓ Kinematic chain successfully established');
        } else {
            console.warn('✗ Could not find all parts for kinematic chain', {baseJoint, part05, part04, part03, upperArm});
        }

        // Auto-Scaling & Centering
        const box = new THREE.Box3().setFromObject(robotArm);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 12 / maxDim; // Dynamic scale to fit 12 units (increased size)
        robotArm.scale.set(scale, scale, scale);

        // Center the model so its BASE (min Y) is at y=-5, and center X/Z
        box.setFromObject(robotArm); // Recalculate after scaling
        const center = new THREE.Vector3();
        box.getCenter(center);
        robotArm.position.x += (0 - center.x);
        robotArm.position.y += (-5 - box.min.y); // Align bottom to -5 (moved down)
        robotArm.position.z += (0 - center.z);
        
        // Add to scene
        scene.add(robotArm);
        
        console.log('✓ Model loaded successfully', robotArm);
    },
    // Progress callback (optional)
    (progress) => {
        const percentComplete = (progress.loaded / progress.total) * 100;
        console.log(`Model loading: ${percentComplete.toFixed(0)}%`);
    },
    // Error callback
    (error) => {
        console.error('✗ Model loading failed:', error);
        
        // On-Screen Error UI
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        errorDiv.style.color = 'red';
        errorDiv.style.padding = '20px';
        errorDiv.style.border = '2px solid red';
        errorDiv.style.zIndex = '9999';
        errorDiv.style.fontFamily = 'monospace';
        errorDiv.style.textAlign = 'center';
        errorDiv.innerHTML = `<h3>GLTFLoader Error</h3><p>${error.message}</p><p>Check console for details.</p>`;
        document.body.appendChild(errorDiv);

        // Procedural Fallback (Sanity Check)
        const geometry = new THREE.CylinderGeometry(2, 2, 10, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff66 });
        robotArm = new THREE.Mesh(geometry, material);
        robotArm.position.set(0, 0, 0); // Center of screen
        scene.add(robotArm);
        console.log('✓ Spawned fallback CylinderGeometry');
    }
);

// ============================================
// 5. MOUSE TRACKING VARIABLES
// ============================================

let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

console.log('✓ Mouse tracking variables initialized');

// ============================================
// 6. EVENT LISTENERS
// ============================================

// Mouse Movement - Track cursor position
document.addEventListener('mousemove', (event) => {
    // Normalize coordinates relative to window center
    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;
});

// Window Resize - Handle responsive behavior
window.addEventListener('resize', () => {
    // Update size object
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    
    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    
    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    
    console.log(`✓ Resized to ${sizes.width}x${sizes.height}`);
});

console.log('✓ Event listeners attached');

// ============================================
// 7. RENDERER SETUP
// ============================================

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,  // Smooth edges
    alpha: false,
    precision: 'highp'
});

// Set renderer size to match window
renderer.setSize(sizes.width, sizes.height);

// Set pixel ratio for retina displays (max 2x for performance)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Set color space
renderer.outputColorSpace = THREE.SRGBColorSpace;

console.log('✓ Renderer setup complete');

// ============================================
// 8. ANIMATION LOOP
// ============================================

// Store target rotations separately for interpolation
let targetYaw = 0;
let targetPitch04 = 0;
let targetPitch03 = 0;

function animate() {
    // 1. Calculate raw target angles based on mouse position
    // Base Yaw: Left/Right up to 90 degrees (Math.PI / 2)
    let rawTargetX = (mouseX / windowHalfX) * (Math.PI / 2); 
    // Arm Pitch: Up/Down up to 45 degrees (Math.PI / 4)
    let rawTargetY = (mouseY / windowHalfY) * (Math.PI / 4);
    
    if (robotArm && part05 && part04 && part03) {
        // 2. Base Yaw (Left/Right)
        // Because the GLTF is exported with a -90deg X rotation, the local Z axis points UP (World Y).
        // Therefore, we rotate around local Z to achieve horizontal yaw.
        targetYaw = THREE.MathUtils.clamp(rawTargetX, -Math.PI / 2, Math.PI / 2);
        
        // Smoothly interpolate current rotation to target rotation
        part05.rotation.z = THREE.MathUtils.lerp(part05.rotation.z, part05RotY + targetYaw, 0.05);

        // 3. Arm Pitch (Forward/Backward)
        // The local X axis remains aligned with the World X axis.
        // We split the pitch between the lower arm (part04) and upper arm (part03)
        let clampedPitch04 = THREE.MathUtils.clamp(rawTargetY, -0.6, 0.6); // Lower arm limits
        let clampedPitch03 = THREE.MathUtils.clamp(rawTargetY * 1.5, -0.8, 0.8); // Upper arm limits
        
        targetPitch04 = clampedPitch04;
        targetPitch03 = clampedPitch03;

        // Smoothly interpolate pitch
        part04.rotation.x = THREE.MathUtils.lerp(part04.rotation.x, part04RotX + targetPitch04, 0.05);
        part03.rotation.x = THREE.MathUtils.lerp(part03.rotation.x, part03RotX + targetPitch03, 0.05);
    }
    
    // Render the scene
    renderer.render(scene, camera);
    
    // Request next animation frame (~60 FPS)
    window.requestAnimationFrame(animate);
}

// Start the animation loop
animate();

console.log('✓ Animation loop started');


// ============================================
// 10. DEBUG INFO
// ============================================

console.log('=== THREE.JS SCENE INITIALIZED ===');
console.log('Scene:', scene);
console.log('Camera:', camera);
console.log('Camera Position:', camera.position);
console.log('Canvas Size:', `${sizes.width}x${sizes.height}`);
console.log('Device Pixel Ratio:', renderer.getPixelRatio());
console.log('==============================');
console.log('Mouse the model to rotate it!');
