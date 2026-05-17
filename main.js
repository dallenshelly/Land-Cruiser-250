import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, car, controls, clock;

const COLORS = {
    bg: 0x050508,
    ambient: 0x111122,
    accent: 0xFFD700,
    floor: 0x0a0a0e,
    fog: 0x050508,
    accentSecondary: 0xFFAA00,
    warmLight: 0xFFE4B5
};

function showError(title, message) {
    document.getElementById('loading-screen').classList.add('hidden');
    const errorContainer = document.getElementById('error-container');
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    errorContainer.classList.remove('hidden');
}

window.addEventListener('error', (e) => {
    console.error('Error:', e.message, e.filename, e.lineno);
});

function init() {
    try {
        clock = new THREE.Clock();

        scene = new THREE.Scene();
        scene.background = new THREE.Color(COLORS.bg);
        scene.fog = new THREE.Fog(COLORS.fog, 15, 50);

        camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(3.5, 1.8, 3.5);

        renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('canvas'),
            antialias: true,
            alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        console.log('Renderer created');

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 0.1;
        controls.maxDistance = 3;
        controls.maxPolarAngle = Math.PI / 2 - 0.05;
        controls.target.set(0, 0.6, 0);
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.0;

        setupLighting();
        createFloor();
        loadCarModel();

        setupEventListeners();
        animate();

    } catch (err) {
        console.error('Init error:', err);
        showError('Error', err.message);
    }
}

function loadCarModel() {
    const loader = new GLTFLoader();
    const modelPath = './glb/2024_toyota_land_cruiser_250.glb';
    const fallbackPath = './glb/2024_toyota_land_cruiser_lc300_vxr_409_tt.glb';

    loader.load(
        modelPath,
        (gltf) => {
            processCarModel(gltf.scene);
        },
        (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            document.querySelector('.loader-text').textContent = 'LOADING ' + percent + '%';
        },
        (error) => {
            console.warn('Land Cruiser 250 model failed, trying Toyota:', error);
            loader.load(
                fallbackPath,
                (gltf) => {
                    processCarModel(gltf.scene);
                },
                (progress) => {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    document.querySelector('.loader-text').textContent = 'LOADING ' + percent + '%';
                },
                (err) => {
                    showError('Load Error', 'Could not load any 3D model.');
                }
            );
        }
    );
}

function processCarModel(model) {
    car = model;

    car.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
                child.material.envMapIntensity = 1.0;

                if (child.material.map) {
                    child.material.map.encoding = THREE.SRGBColorSpace;
                }
            }
        }
    });

    const box = new THREE.Box3().setFromObject(car);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.0 / maxDim;

    car.scale.setScalar(scale);

    car.position.x = -center.x * scale;
    car.position.z = -center.z * scale;
    car.position.y = -box.min.y * scale;

    controls.target.set(0, size.y * scale / 2, 0);

    scene.add(car);

    document.getElementById('loading-screen').classList.add('fade-out');
    showCTA();
}

function setupLighting() {
    const ambient = new THREE.AmbientLight(COLORS.ambient, 0.5);
    ambient.name = 'ambient';
    scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222233, 0.4);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xFFDD88, 0.4);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(COLORS.accent, 0.6);
    rimLight.position.set(-3, 4, -8);
    scene.add(rimLight);

    const spotLight = new THREE.SpotLight(0xffffff, 2);
    spotLight.position.set(3, 6, 3);
    spotLight.angle = Math.PI / 5;
    spotLight.penumbra = 0.4;
    spotLight.castShadow = true;
    scene.add(spotLight);

    const accentPoint = new THREE.PointLight(COLORS.accent, 1.2, 10);
    accentPoint.position.set(0, 2, 4);
    accentPoint.name = 'accentLight';
    scene.add(accentPoint);

    const groundLight = new THREE.PointLight(0xFFD700, 0.5, 6);
    groundLight.position.set(0, 0.1, 2);
    scene.add(groundLight);
}

function createFloor() {
    const floorGeom = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
        color: COLORS.floor,
        roughness: 0.6,
        metalness: 0.4,
        envMapIntensity: 0.6
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floor.name = 'floor';
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(30, 30, 0x2a2a15, 0x151510);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    const ringGeom = new THREE.RingGeometry(2.5, 2.6, 64);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);
}

function showCTA() {
    document.getElementById('cta-container').classList.add('visible');
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    document.getElementById('cta-btn').addEventListener('click', () => {
        document.getElementById('specs').scrollIntoView({ behavior: 'smooth' });
    });

    controls.addEventListener('start', () => {
        controls.autoRotate = false;
    });

    // Scroll animations
    setupScrollAnimations();

    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Create floating particles
    createParticles();

    // Typing effect for title
    setupTypingEffect();
}

function setupTypingEffect() {
    const title = document.querySelector('.specs-title');
    const subtitle = document.querySelector('.specs-subtitle');

    if (title && subtitle) {
        const titleText = title.dataset.text || 'Land Cruiser 250';
        const subtitleText = subtitle.dataset.text || 'The Legend Reborn';

        // Clear and type title
        title.textContent = '';
        let titleIndex = 0;
        const titleTyping = setInterval(() => {
            if (titleIndex < titleText.length) {
                title.textContent += titleText.charAt(titleIndex);
                titleIndex++;
            } else {
                clearInterval(titleTyping);
            }
        }, 80);

        // Type subtitle after title finishes
        setTimeout(() => {
            subtitle.textContent = '';
            let subtitleIndex = 0;
            const subtitleTyping = setInterval(() => {
                if (subtitleIndex < subtitleText.length) {
                    subtitle.textContent += subtitleText.charAt(subtitleIndex);
                    subtitleIndex++;
                } else {
                    clearInterval(subtitleTyping);
                }
            }, 80);
        }, titleText.length * 80 + 300);

        // Fade out after 14 seconds
        setTimeout(() => {
            title.style.transition = 'all 1s ease';
            title.style.opacity = '0';
            title.style.transform = 'translateY(-20px)';
            subtitle.style.transition = 'all 1s ease';
            subtitle.style.opacity = '0';
            subtitle.style.transform = 'translateY(-20px)';
        }, 14000);
    }
}

function createParticles() {
    const container = document.getElementById('particles');
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}

function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe all elements with animation classes
    document.querySelectorAll('.fade-in-section, .slide-in-left, .slide-in-right, .scale-in').forEach(el => {
        observer.observe(el);
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    controls.update();
    renderer.render(scene, camera);
}

init();