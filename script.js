document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    const DEBUG_MODE = true;
    let currentLanguage = 'mr';
    let allContent;

    let heroScene, heroCamera, heroRenderer, heroStars, heroMouseTarget = { x: 0, y: 0 };
    const timelineScenes = []; // Stores { id, container, scene, camera, renderer, objects, isActive, originalCameraPos, initialized: false }
                               // Added 'initialized' flag

    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    const langButtons = document.querySelectorAll('.language-switcher button');
    const startJourneyBtn = document.getElementById('start-journey-btn');
    const heroSection = document.getElementById('hero-section');
    const visualJourneyContainer = document.getElementById('visual-journey-container');
    const heroCanvasContainer = document.getElementById('hero-threejs-canvas-container');
    const navigationDotsContainer = document.querySelector('.navigation-dots');
    const header = document.querySelector('header');
    const logoElement = document.getElementById('logo_text');

    async function loadContentAndInit() {
        try {
            const response = await fetch('content_data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allContent = await response.json();

            if (allContent.ui_translations['loader-text']) {
                loaderText.textContent = allContent.ui_translations['loader-text'][currentLanguage] || "Loading...";
            }

            initHeroThreeJS();
            updateUIForLanguage(); // For static text
            createTimelineSections(); // Creates DOM and attempts initial initTimelineScene
            setupEventListeners();    // Sets up button clicks, including startJourneyBtn
            initScrollAnimations();   // Sets up GSAP and ScrollTrigger

            // Collective resize attempt for HERO only initially. Timeline scenes will be handled
            // more robustly after visualJourneyContainer is displayed.
            setTimeout(() => {
                if (DEBUG_MODE) console.log("Attempting initial HERO resize...");
                onHeroWindowResize();
                // ScrollTrigger.refresh(true); // Refresh after hero is sized
                // if (DEBUG_MODE) console.log("Initial hero resize and ScrollTrigger.refresh(true) done.");
            }, 500);


            setTimeout(() => {
                loader.classList.add('hidden');
                animateHero();
                if (DEBUG_MODE) console.log("Loader hidden, hero animation started.");
            }, 700);

        } catch (error) {
            // ... (error handling same) ...
            console.error("Error loading content:", error);
            const errorMsgKey = 'error-loading-content';
            const fallbackErrorMsg = "Error loading content. Please refresh the page.";
            if (allContent && allContent.ui_translations && allContent.ui_translations[errorMsgKey] && allContent.ui_translations[errorMsgKey][currentLanguage]) {
                loaderText.textContent = allContent.ui_translations[errorMsgKey][currentLanguage];
            } else if (allContent && allContent.ui_translations && allContent.ui_translations[errorMsgKey] && allContent.ui_translations[errorMsgKey]['en']) {
                loaderText.textContent = allContent.ui_translations[errorMsgKey]['en'];
            }
            else {
                loaderText.textContent = fallbackErrorMsg;
            }
        }
    }

    // ... (updateUIForLanguage, formatNumber, hero functions, createStarTexture, onHeroWindowResize are same) ...
    function updateUIForLanguage() {
        if (!allContent) return;
        document.documentElement.lang = currentLanguage;
        langButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === currentLanguage);
        });

        const translations = allContent.ui_translations;
        const translatableMap = {
            'loader-text': loaderText,
            'intro-title': document.getElementById('intro-title'),
            'intro-paragraph': document.getElementById('intro-paragraph'),
            'start-journey-btn': startJourneyBtn,
            'footer-text': document.getElementById('footer-text'),
            'logo_text': logoElement
        };

        for (const key in translatableMap) {
            if (translatableMap[key] && translations[key] && translations[key][currentLanguage]) {
                translatableMap[key].textContent = translations[key][currentLanguage];
            } else if (translatableMap[key] && translations[key] && translations[key]['en']) { // Fallback to English
                translatableMap[key].textContent = translations[key]['en'];
            }
        }

        document.querySelectorAll('.timeline-section').forEach((section) => {
            const sceneId = section.dataset.sceneId;
            const sceneData = allContent.kalakhand.find(s => s.id === sceneId);
            if (sceneData) {
                section.querySelector('.info-title').textContent = sceneData.name[currentLanguage] || sceneData.name['en'];
                section.querySelector('.info-description').textContent = sceneData.description[currentLanguage] || sceneData.description['en'];

                const detailsList = section.querySelector('.info-details-list');
                const detailsHeading = section.querySelector('.info-details-heading');
                if (detailsList && detailsHeading && sceneData.details && sceneData.details[currentLanguage] && sceneData.details[currentLanguage].length > 0) {
                    detailsHeading.textContent = translations['details-label']?.[currentLanguage] || translations['details-label']?.['en'] || "Key Points:";
                    detailsHeading.style.display = 'inline-block';
                    detailsList.innerHTML = sceneData.details[currentLanguage].map(point => `<li>${point}</li>`).join('');
                    detailsList.style.display = 'block';
                } else if (detailsList && detailsHeading) {
                    detailsList.innerHTML = '';
                    detailsList.style.display = 'none';
                    detailsHeading.style.display = 'none';
                }


                const durationEl = section.querySelector('.info-duration');
                const divineDurationEl = section.querySelector('.info-divine-duration');
                const durationLabel = translations['duration-label']?.[currentLanguage] || translations['duration-label']?.['en'] || 'Duration';
                const humanYearsUnit = translations['human-years-unit']?.[currentLanguage] || translations['human-years-unit']?.['en'] || 'Human Years';
                const divineYearsUnit = translations['divine-years-unit']?.[currentLanguage] || translations['divine-years-unit']?.['en'] || 'Divine Years';

                if (durationEl) {
                    if (sceneData.duration_human_years) {
                        durationEl.textContent = `${durationLabel}: ${formatNumber(sceneData.duration_human_years, currentLanguage)} ${humanYearsUnit}`;
                        durationEl.style.display = 'block';
                    } else if (sceneData.duration_human_years_text && (sceneData.duration_human_years_text[currentLanguage] || sceneData.duration_human_years_text['en'])) {
                        durationEl.textContent = sceneData.duration_human_years_text[currentLanguage] || sceneData.duration_human_years_text['en'];
                        durationEl.style.display = 'block';
                    } else {
                        durationEl.style.display = 'none';
                    }
                }

                if (divineDurationEl) {
                    if (sceneData.duration_divine_years_text && (sceneData.duration_divine_years_text[currentLanguage] || sceneData.duration_divine_years_text['en'])) {
                        divineDurationEl.textContent = `${durationLabel}: ${sceneData.duration_divine_years_text[currentLanguage] || sceneData.duration_divine_years_text['en']}`;
                        divineDurationEl.style.display = 'block';
                    } else {
                        divineDurationEl.style.display = 'none';
                    }
                }
            }
        });
    }
    function formatNumber(num, lang) { 
        if (isNaN(parseFloat(num))) return num;
        const locale = lang === 'mr' ? 'mr-IN' : (lang === 'hi' ? 'hi-IN' : 'en-US');
        try {
            return new Intl.NumberFormat(locale).format(num);
        } catch (e) {
            if(DEBUG_MODE) console.warn("Error formatting number for locale:", locale, e);
            return new Intl.NumberFormat('en-US').format(num); 
        }
    }
    function initHeroThreeJS() { 
        if (!heroCanvasContainer || (heroCanvasContainer.clientWidth === 0 && heroCanvasContainer.clientHeight === 0)) {
            if (DEBUG_MODE) console.log("Hero canvas container not ready, retrying initHeroThreeJS...");
            setTimeout(initHeroThreeJS, 100);
            return;
        }
        heroScene = new THREE.Scene();
        heroCamera = new THREE.PerspectiveCamera(75, heroCanvasContainer.clientWidth / heroCanvasContainer.clientHeight, 0.1, 2000);
        heroCamera.position.z = 5;

        heroRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        heroRenderer.setSize(heroCanvasContainer.clientWidth, heroCanvasContainer.clientHeight);
        heroRenderer.setPixelRatio(window.devicePixelRatio);
        heroCanvasContainer.appendChild(heroRenderer.domElement);

        const starGeometry = new THREE.BufferGeometry();
        const starCount = 30000;
        const posArray = new Float32Array(starCount * 3);
        const colorArray = new Float32Array(starCount * 3);
        const baseColor = new THREE.Color(0x9bb0ff);

        for (let i = 0; i < starCount; i++) {
            posArray[i * 3] = (Math.random() - 0.5) * 1500;
            posArray[i * 3 + 1] = (Math.random() - 0.5) * 1500;
            posArray[i * 3 + 2] = (Math.random() - 0.5) * 1500;

            const colorVariation = (Math.random() - 0.5) * 0.4;
            colorArray[i * 3] = baseColor.r + colorVariation;
            colorArray[i * 3 + 1] = baseColor.g + colorVariation;
            colorArray[i * 3 + 2] = baseColor.b + colorVariation;
        }
        starGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: 0.35,
            map: createStarTexture(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true,
            opacity: 0.85
        });
        heroStars = new THREE.Points(starGeometry, starMaterial);
        heroScene.add(heroStars);
        
        onHeroWindowResize(); 
        if (DEBUG_MODE) console.log("Hero Three.js initialized.");
    }
    function createStarTexture() { 
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(200,200,255,0.8)');
        gradient.addColorStop(0.4, 'rgba(150,150,255,0.3)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        return new THREE.CanvasTexture(canvas);
    }
    function onHeroWindowResize() { 
        if (!heroCamera || !heroRenderer || !heroCanvasContainer || heroCanvasContainer.clientWidth === 0 || heroCanvasContainer.clientHeight === 0) {
             if (DEBUG_MODE && heroCanvasContainer) console.warn("Hero canvas not ready for resize (clientWidth or clientHeight is 0).");
            return;
        }
        const newWidth = heroCanvasContainer.clientWidth;
        const newHeight = heroCanvasContainer.clientHeight;
        heroCamera.aspect = newWidth / newHeight;
        heroCamera.updateProjectionMatrix();
        heroRenderer.setSize(newWidth, newHeight);
        if (DEBUG_MODE) console.log(`Hero canvas resized to: ${newWidth}x${newHeight}`);
    }
    function animateHero() { 
        if (!heroRenderer) return;
        requestAnimationFrame(animateHero);
        if (heroStars) {
            heroStars.rotation.y += 0.00003;
            heroStars.rotation.x += 0.00002;
        }
        if (heroCamera && heroScene && heroRenderer) { 
            heroCamera.position.x += (heroMouseTarget.x * 0.5 - heroCamera.position.x) * 0.02;
            heroCamera.position.y += (heroMouseTarget.y * 0.5 - heroCamera.position.y) * 0.02;
            heroCamera.lookAt(heroScene.position);
            heroRenderer.render(heroScene, heroCamera);
        }
    }


    function setupEventListeners() {
        langButtons.forEach(button => {
            button.addEventListener('click', () => {
                currentLanguage = button.dataset.lang;
                updateUIForLanguage();
                ScrollTrigger.refresh(true);
            });
        });

        startJourneyBtn.addEventListener('click', () => {
            visualJourneyContainer.style.display = 'block';
            navigationDotsContainer.style.display = 'flex';

            // CRITICAL: After making visualJourneyContainer visible,
            // ensure all Three.js scenes within it are properly initialized and sized.
            requestAnimationFrame(() => { // Allow DOM to update display style
                if (DEBUG_MODE) console.log("Start Journey Clicked: Visual Journey Container now visible.");
                let allScenesInitializedOrSized = true;
                timelineScenes.forEach(ts => {
                    if (!ts.initialized && ts.container) {
                        if (DEBUG_MODE) console.log(`Re-attempting initialization for scene ${ts.id} as it was not fully initialized.`);
                        // This will re-run the dimension check and setup if it failed before
                        initTimelineScene(ts.container, allContent.kalakhand.find(k => k.id === ts.id), true); // Pass a flag to force re-check
                    } else if (ts.initialized && ts.container && ts.camera && ts.renderer) {
                        if (ts.container.clientWidth > 0 && ts.container.clientHeight > 0) {
                            onTimelineSceneResize(ts.container, ts.camera, ts.renderer);
                        } else {
                            allScenesInitializedOrSized = false;
                            if (DEBUG_MODE) console.error(`Start Journey: Scene ${ts.id} container still has NO dimensions after becoming visible. W: ${ts.container.clientWidth}, H: ${ts.container.clientHeight}`);
                        }
                    } else if (!ts.container && DEBUG_MODE){
                         console.error(`Start Journey: Scene object for ID ${ts.id} is missing its container.`);
                    }
                });

                if (allScenesInitializedOrSized && DEBUG_MODE) console.log("All visible timeline scenes checked/resized.");
                else if (!allScenesInitializedOrSized && DEBUG_MODE) console.warn("Some timeline scenes still have no dimensions after visualJourneyContainer became visible.");

                // Now perform the scroll
                gsap.to(window, {
                    duration: 1.5,
                    scrollTo: {
                        y: visualJourneyContainer.offsetTop - header.offsetHeight + 20,
                        autoKill: false
                    },
                    ease: "power3.inOut",
                    onComplete: () => {
                        ScrollTrigger.refresh(true); // Refresh triggers AFTER scrolling
                        if (DEBUG_MODE) console.log("ScrollTo journey complete, ScrollTrigger refreshed.");
                    }
                });
            });
        });
        
        let lastScrollTop = 0;
        window.addEventListener("scroll", function () {
            let st = window.pageYOffset || document.documentElement.scrollTop;
            const currentHeaderHeight = header.offsetHeight; 
            if (st > lastScrollTop && st > currentHeaderHeight) {
                header.style.top = `-${currentHeaderHeight + 10}px`;
            } else {
                header.style.top = "0";
            }
            lastScrollTop = st <= 0 ? 0 : st;
        }, false);

        document.addEventListener('mousemove', (event) => { /* ... (same mousemove) ... */ });

        window.addEventListener('resize', () => {
            onHeroWindowResize();
            timelineScenes.forEach(ts => {
                if (ts.initialized && ts.container && ts.camera && ts.renderer) { // Only resize initialized scenes
                     if (ts.container.clientWidth > 0 && ts.container.clientHeight > 0) {
                        onTimelineSceneResize(ts.container, ts.camera, ts.renderer);
                    } else if (DEBUG_MODE) {
                        console.warn(`Window Resize: Timeline scene ${ts.id} container has NO dimensions. W: ${ts.container.clientWidth}, H: ${ts.container.clientHeight}`);
                    }
                }
            });
            ScrollTrigger.refresh(true);
            if (DEBUG_MODE) console.log("Window resized, timeline scenes and ScrollTrigger refreshed.");
        }, false);
    }


    function onTimelineSceneResize(container, camera, renderer) {
        // ... (same as before, but critical that it's called when dimensions are > 0) ...
        if (!container || !camera || !renderer) {
            if (DEBUG_MODE) console.warn(`onTimelineSceneResize: Missing component. Container: ${!!container}, Camera: ${!!camera}, Renderer: ${!!renderer} for container ID: ${container ? container.id : 'N/A'}`);
            return;
        }
        // This check is vital. Do not try to resize if container has no effective dimensions.
        if (container.clientWidth === 0 || container.clientHeight === 0) {
            if (DEBUG_MODE) console.warn(`onTimelineSceneResize (ID: ${container.id}): Container has zero dimensions (W: ${container.clientWidth}, H: ${container.clientHeight}). Skipping resize op. Element display: ${getComputedStyle(container).display}`);
            return;
        }
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
        if (DEBUG_MODE) console.log(`Timeline scene (ID: ${container.id}) RESIZED to: ${newWidth}x${newHeight}`);
    }


    function createTimelineSections() {
        if (!allContent || !allContent.kalakhand) {
            console.error("FATAL: Cannot create timeline sections: content_data.json not loaded or kalakhand array missing.");
            return;
        }

        allContent.kalakhand.forEach((data) => {
            const section = document.createElement('section');
            section.className = 'timeline-section full-vh';
            section.id = `scene-${data.id}`;
            section.dataset.sceneId = data.id;

            section.innerHTML = `
                <div class="timeline-content-wrapper">
                    <div class="info-card"><!-- ... card content ... --></div>
                </div>
                <div class="threejs-scene-container" id="threejs-container-${data.id}"></div>
            `;
             // Fill card content for updateUIForLanguage
            const card = section.querySelector('.info-card');
            card.innerHTML = ` 
                <h2 class="info-title"></h2>
                <p class="info-description"></p>
                <h3 class="info-details-heading" style="display:none;"></h3>
                <ul class="info-details-list" style="display:none;"></ul>
                <div class="info-duration-container">
                    <p class="info-divine-duration" style="display:none;"></p>
                    <p class="info-duration" style="display:none;"></p>
                </div>`;

            visualJourneyContainer.appendChild(section);
            
            const threeJsContainer = section.querySelector(`#threejs-container-${data.id}`);
            if (DEBUG_MODE) console.log(`DOM for scene ${data.id} created. threeJsContainer ID: ${threeJsContainer.id}. Calling initTimelineScene.`);
            
            // Store basic info; full initialization will be confirmed by initTimelineScene
            const placeholderSceneObj = {
                id: data.id,
                container: threeJsContainer,
                initialized: false // Mark as not yet fully initialized
            };
            timelineScenes.push(placeholderSceneObj);

            initTimelineScene(threeJsContainer, data); // Attempt initial setup

            const dot = document.createElement('div');
            dot.className = 'nav-dot';
            dot.dataset.target = `#scene-${data.id}`;
            dot.addEventListener('click', () => { /* ... */ });
            navigationDotsContainer.appendChild(dot);
        });
        updateUIForLanguage();
        if (DEBUG_MODE) console.log(`${allContent.kalakhand.length} Timeline sections DOM structure created. Initial initTimelineScene calls made.`);
    }

    let initAttemptCounters = {};

    // Added forceRecheck parameter
    function initTimelineScene(container, sceneData, forceRecheck = false) {
        const sceneId = sceneData.id;
        if (!initAttemptCounters[sceneId]) initAttemptCounters[sceneId] = 0;
        
        // If not forcing recheck, and it's already initialized, skip.
        const existingSceneIndex = timelineScenes.findIndex(s => s.id === sceneId);
        if (existingSceneIndex !== -1 && timelineScenes[existingSceneIndex].initialized && !forceRecheck) {
            if (DEBUG_MODE) console.log(`initTimelineScene (ID: ${sceneId}): Already initialized and not forcing recheck. Skipping.`);
            return;
        }
        
        initAttemptCounters[sceneId]++;

        if (!container) {
            if (DEBUG_MODE) console.error(`initTimelineScene (ID: ${sceneId}, Attempt: ${initAttemptCounters[sceneId]}): CRITICAL - Container is null.`);
            return;
        }
        
        if (DEBUG_MODE) console.log(`initTimelineScene (ID: ${sceneId}, Attempt: ${initAttemptCounters[sceneId]}): Container: ${container.id}, W: ${container.clientWidth}, H: ${container.clientHeight}, Display: ${getComputedStyle(container).display}, Parent Display: ${getComputedStyle(container.parentElement).display}`);

        // Crucial Check: Only proceed if the container is part of the visible DOM layout
        // and has dimensions. offsetParent check is a good indicator.
        if (container.offsetParent === null || container.clientWidth === 0 || container.clientHeight === 0) {
            if (initAttemptCounters[sceneId] < 15) { // Increased retries
                if (DEBUG_MODE) console.warn(`initTimelineScene (ID: ${sceneId}, Attempt: ${initAttemptCounters[sceneId]}): Container not ready (offsetParent: ${container.offsetParent === null}, W:${container.clientWidth}, H:${container.clientHeight}). Retrying in 350ms...`);
                setTimeout(() => initTimelineScene(container, sceneData, forceRecheck), 350);
            } else {
                if (DEBUG_MODE) console.error(`initTimelineScene (ID: ${sceneId}): FAILED after ${initAttemptCounters[sceneId]} attempts. Container ${container.id} never got dimensions or became visible. Check CSS and parent visibility (visualJourneyContainer).`);
                 if (existingSceneIndex !== -1) timelineScenes[existingSceneIndex].initialized = false; // Mark as failed
            }
            return;
        }

        if (DEBUG_MODE) console.log(`SUCCESS: Initializing renderer for Timeline Scene ID: ${sceneId} (Attempt: ${initAttemptCounters[sceneId]}). Container dimensions: ${container.clientWidth}x${container.clientHeight}`);

        // If we reach here, dimensions are good.
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 2000);
        camera.position.z = 15;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Clear previous canvas if re-initializing
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.3);
        directionalLight.position.set(10, 15, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        scene.add(directionalLight);
        
        scene.fog = new THREE.FogExp2(0x0a192f, 0.01);

        const objects = createSceneSpecificObjects(sceneData.id, scene, camera, renderer); // This sets camera positions too

        const timelineSceneObj = {
            id: sceneData.id, container, scene, camera, renderer, objects, 
            isActive: false, originalCameraPos: camera.position.clone(),
            initialized: true // Mark as fully initialized
        };
        
        if (existingSceneIndex !== -1) {
            timelineScenes[existingSceneIndex] = timelineSceneObj; // Update existing entry
        } else {
            // This case should ideally not happen if placeholder was added correctly
            timelineScenes.push(timelineSceneObj);
            if(DEBUG_MODE) console.warn(`initTimelineScene (ID: ${sceneId}): Pushed new object, placeholder was missing?`);
        }
        
        if (DEBUG_MODE) console.log(`Timeline scene ${sceneData.id} fully initialized. Total scenes in array: ${timelineScenes.length}`);
        
        // Remove old observer if any, and add new
        if (container._resizeObserver) {
            container._resizeObserver.disconnect();
        }
        container._resizeObserver = new ResizeObserver(entries => { /* ... (resize observer same) ... */ });
        container._resizeObserver.observe(container);
        new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    const sceneToResize = timelineScenes.find(s => s.id === entry.target.id.replace('threejs-container-', '')); // Find by derived ID
                    if (sceneToResize && sceneToResize.initialized) { // Check if it's the right scene and initialized
                        onTimelineSceneResize(sceneToResize.container, sceneToResize.camera, sceneToResize.renderer);
                    }
                } else if (DEBUG_MODE) {
                    console.warn(`ResizeObserver (ID: ${entry.target.id}): Container has zero dimensions during resize event.`);
                }
            }
        }).observe(container);


        requestAnimationFrame(() => {
            if (container.clientWidth > 0 && container.clientHeight > 0) {
                onTimelineSceneResize(container, camera, renderer);
                renderer.render(scene, camera); // Perform an initial render
                if(DEBUG_MODE) console.log(`Initial RAF render for ${sceneId} completed.`);
            } else if (DEBUG_MODE) {
                 console.warn(`initTimelineScene (ID: ${sceneData.id}): Container still has NO dimensions for final RAF resize call. W:${container.clientWidth}, H:${container.clientHeight}`);
            }
        });
    }


    // createSceneSpecificObjects remains the same as the version that had individual debug logs and camera settings per scene.
    // Ensure all those camera.position.set() and camera.lookAt() calls are correct for your object sizes.
    function createSceneSpecificObjects(sceneId, threeScene, camera, renderer) {
        const createdObjects = [];
        let mainObject;
        const textureLoader = new THREE.TextureLoader();

        if (DEBUG_MODE) console.log(`createSceneSpecificObjects - START for scene ID: ${sceneId}`);

        let defaultCameraZ = 12; 

        try {
            switch (sceneId) {
                case 'manushya_kaal': {
                    const earthGroup = new THREE.Group();
                    const earthTexture = textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg', 
                        () => { if (DEBUG_MODE) console.log('Earth texture loaded for manushya_kaal'); renderer.render(threeScene, camera); }, 
                        undefined, 
                        (err) => { console.error('Error loading Earth texture for manushya_kaal:', err); }
                    );
                    const earthBump = textureLoader.load('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg');
                    const earthSpec = textureLoader.load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg');
                    const earthClouds = textureLoader.load('https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
                         () => { if (DEBUG_MODE) console.log('Earth clouds texture loaded'); renderer.render(threeScene, camera); }
                    );

                    const earthRadius = 3; 
                    const earthMesh = new THREE.Mesh(
                        new THREE.SphereGeometry(earthRadius, 64, 64),
                        new THREE.MeshPhongMaterial({ 
                            map: earthTexture, bumpMap: earthBump, bumpScale: 0.05, 
                            specularMap: earthSpec, specular: new THREE.Color('grey'), shininess: 10
                        })
                    );
                    earthMesh.castShadow = true; earthMesh.receiveShadow = true;
                    earthGroup.add(earthMesh);

                    const cloudMesh = new THREE.Mesh(
                        new THREE.SphereGeometry(earthRadius + 0.05, 64, 64),
                        new THREE.MeshPhongMaterial({ map: earthClouds, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
                    );
                    earthGroup.add(cloudMesh);
                    
                    mainObject = earthGroup;
                    mainObject.userData.animate = (time) => { 
                        earthMesh.rotation.y = time * 0.04; 
                        cloudMesh.rotation.y = time * 0.05;
                        cloudMesh.rotation.x = time * 0.005;
                    };
                    camera.position.set(0, 1, earthRadius * 3); 
                    camera.lookAt(earthGroup.position); 
                    if (DEBUG_MODE) console.log(`Manushya Kaal (Earth) created. Radius: ${earthRadius}. Cam Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                    break;
                }
                case 'divya_kaal': {
                    const group = new THREE.Group();
                    const humanGearMat = new THREE.MeshStandardMaterial({color: 0x64ffda, metalness:0.7, roughness:0.3});
                    const divineGearMat = new THREE.MeshStandardMaterial({color: 0xffd700, metalness:0.8, roughness:0.2});
                    
                    const humanGear = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.4, 10, 24), humanGearMat);
                    humanGear.rotation.x = Math.PI / 2.1; 
                    humanGear.position.x = -2.5; 
                    humanGear.castShadow = true; group.add(humanGear);

                    const divineGear = new THREE.Mesh(new THREE.TorusGeometry(3, 0.6, 12, 36), divineGearMat); 
                    divineGear.rotation.x = Math.PI / 1.9; 
                    divineGear.position.x = 2.8; 
                    divineGear.castShadow = true; group.add(divineGear);
                    
                    mainObject = group;
                    mainObject.userData.animate = (time) => { 
                        humanGear.rotation.z = time * 0.4; 
                        divineGear.rotation.z = time * 0.04;
                    };
                    camera.position.set(0, 2, defaultCameraZ + 2); 
                    camera.lookAt(group.position);
                    if (DEBUG_MODE) console.log(`Divya Kaal (Gears) created. Cam Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                    break;
                }
                 case 'satya_yuga': case 'treta_yuga': case 'dwapara_yuga': case 'kali_yuga': {
                    const yugaData = {
                        'satya_yuga': { color: 0xFFD700, emissive: 0xB8860B, particleColor: 0xFFFACD, geometry: new THREE.IcosahedronGeometry(3.5, 1) },
                        'treta_yuga': { color: 0xC0C0C0, emissive: 0x808080, particleColor: 0xE6E6FA, geometry: new THREE.OctahedronGeometry(3.2, 1) },
                        'dwapara_yuga': { color: 0xCD7F32, emissive: 0x8B4513, particleColor: 0xFFE4B5, geometry: new THREE.DodecahedronGeometry(3, 1) },
                        'kali_yuga': { color: 0x505050, emissive: 0x202020, particleColor: 0x778899, geometry: new THREE.TorusKnotGeometry(2.5, 0.8, 100, 12, 2, 3) }
                    };
                    const data = yugaData[sceneId];
                    const yugaMat = new THREE.MeshStandardMaterial({ 
                        color: data.color, metalness: 0.8, roughness: 0.3, 
                        emissive: data.emissive, emissiveIntensity: 0.5 
                    });
                    mainObject = new THREE.Mesh(data.geometry, yugaMat);
                    mainObject.castShadow = true;
                    mainObject.userData.animate = (time) => { 
                        mainObject.rotation.x = time * 0.03; 
                        mainObject.rotation.y = time * 0.04; 
                    };
                    
                    const particleCount = sceneId === 'kali_yuga' ? 500 : 250; 
                    const particleGeo = new THREE.BufferGeometry();
                    const pPos = new Float32Array(particleCount * 3);
                    for(let i=0; i<particleCount*3; i++) pPos[i] = (Math.random() - 0.5) * (sceneId === 'kali_yuga' ? 20 : 16); 
                    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
                    const pMat = new THREE.PointsMaterial({color: data.particleColor, size: sceneId === 'kali_yuga' ? 0.16 : 0.12, transparent:true, opacity:0.7, blending:THREE.AdditiveBlending, depthWrite:false});
                    const particles = new THREE.Points(particleGeo, pMat);
                    particles.userData.animate = (time) => {
                         particles.rotation.y = time * (sceneId === 'kali_yuga' ? -0.02 : 0.01);
                    };
                    threeScene.add(particles);
                    createdObjects.push(particles);

                    camera.position.z = defaultCameraZ; 
                    camera.lookAt(mainObject.position);
                    if (DEBUG_MODE) console.log(`${sceneId} created. Cam Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                    break;
                }
                 case 'mahayuga': {
                    mainObject = new THREE.Group();
                    const yugaColors = [0xFFD700, 0xC0C0C0, 0xCD7F32, 0x505050];
                    const radii = [4, 3.2, 2.4, 1.6]; 
                    for (let i = 0; i < 4; i++) {
                        const ring = new THREE.Mesh(
                            new THREE.TorusGeometry(radii[i], 0.25, 16, 60),
                            new THREE.MeshStandardMaterial({ color: yugaColors[i], metalness: 0.7, roughness: 0.4, emissive: yugaColors[i], emissiveIntensity:0.3 })
                        );
                        ring.rotation.x = Math.PI / 2.2;
                        ring.userData.rotationSpeed = (0.02 + i * 0.005) * (i % 2 === 0 ? 1 : -1) ;
                        ring.castShadow = true;
                        mainObject.add(ring);
                    }
                    mainObject.userData.animate = (time) => {
                        mainObject.children.forEach(ring => ring.rotation.z = time * ring.userData.rotationSpeed);
                    };
                    camera.position.set(0,3,defaultCameraZ); camera.lookAt(mainObject.position);
                     if (DEBUG_MODE) console.log(`Mahayuga created. Cam Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                    break;
                }
                case 'manvantara': {
                    mainObject = new THREE.Group();
                    const discGeo = new THREE.CylinderGeometry(5, 5, 0.3, 71);
                    const discMat = new THREE.MeshStandardMaterial({color: 0x30689c, metalness:0.6, roughness:0.5, transparent: true, opacity:0.8});
                    const disc = new THREE.Mesh(discGeo, discMat);
                    disc.castShadow = true; disc.receiveShadow = true;
                    mainObject.add(disc);

                    for(let i=0; i<71; i++) {
                        const angle = (i/71) * Math.PI * 2;
                        const gem = new THREE.Mesh(
                            new THREE.SphereGeometry(0.2, 16,16),
                            new THREE.MeshPhongMaterial({color: 0x64ffda, emissive:0x64ffda, emissiveIntensity:0.6, shininess:90})
                        );
                        gem.position.set(Math.cos(angle) * 4.5, 0.3, Math.sin(angle) * 4.5);
                        gem.castShadow = true;
                        mainObject.add(gem);
                    }
                    mainObject.userData.animate = (time) => { mainObject.rotation.y = time * 0.02; };
                    camera.position.set(0,8,defaultCameraZ); camera.lookAt(mainObject.position);
                    if (DEBUG_MODE) console.log(`Manvantara created. Cam Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                    break;
                }
                case 'kalpa': {
                    mainObject = new THREE.Group(); 
                    const stemMat = new THREE.MeshPhongMaterial({ color: 0x228B22, shininess: 40 }); 
                    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 6, 12), stemMat);
                    stem.position.y = -3; stem.castShadow = true;
                    mainObject.add(stem);

                    const petalMat = new THREE.MeshPhysicalMaterial({ 
                        color: 0xFFB6C1, metalness: 0.2, roughness: 0.4,
                        transmission: 0.8, transparent: true, opacity: 0.9,
                        side: THREE.DoubleSide, emissive: 0xff8899, emissiveIntensity: 0.2
                    });

                    const petalShape = new THREE.Shape();
                    petalShape.moveTo(0, 0);
                    petalShape.bezierCurveTo(0.5, 0.5, 1.5, 2.5, 0, 4); 
                    petalShape.bezierCurveTo(-1.5, 2.5, -0.5, 0.5, 0, 0);
                    const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 0.1, bevelThickness: 0.1 };
                    const petalGeo = new THREE.ExtrudeGeometry(petalShape, extrudeSettings);
                    
                    const numPetalLayers = 3; const petalsPerLayer = [8, 12, 16];
                    const layerRadius = [0.5, 1.0, 1.5]; const layerTilt = [Math.PI / 4, Math.PI / 3, Math.PI / 2.5];

                    for (let l = 0; l < numPetalLayers; l++) {
                        for (let i = 0; i < petalsPerLayer[l]; i++) {
                            const petal = new THREE.Mesh(petalGeo, petalMat);
                            const angle = (i / petalsPerLayer[l]) * Math.PI * 2;
                            petal.scale.set(0.8 - l*0.1, 0.8 - l*0.1, 0.8-l*0.1);
                            petal.position.set( Math.cos(angle) * layerRadius[l], l * 0.3, Math.sin(angle) * layerRadius[l]);
                            petal.rotation.y = angle + Math.PI /2; petal.rotation.x = layerTilt[l] + (Math.random() - 0.5) * 0.1;
                            petal.castShadow = true; mainObject.add(petal);
                        }
                    }
                    const brahmaPlaceholder = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshPhongMaterial({color: 0xffcc00, emissive:0xffaa00, emissiveIntensity:0.6}));
                    brahmaPlaceholder.position.y = 1.5 + (numPetalLayers-1)*0.3; 
                    brahmaPlaceholder.castShadow = true;
                    mainObject.add(brahmaPlaceholder);

                    mainObject.scale.set(1.1,1.1,1.1); 
                    mainObject.position.y = -1; 
                    mainObject.userData.animate = (time) => { 
                        mainObject.rotation.y = time * 0.02; 
                        mainObject.children.filter(c=>c !== stem).forEach((petal, idx) => {
                            if (petal !== brahmaPlaceholder) petal.rotation.z = Math.sin(time * 0.1 + idx * 0.5) * 0.05; 
                        });
                    };
                    camera.position.set(0, 3, defaultCameraZ + 6); camera.lookAt(0,1,0); 
                    if (DEBUG_MODE) console.log(`Kalpa (Lotus) created. Cam Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                    break;
                }
                case 'pralaya_brahma_night': {
                    mainObject = new THREE.Group();
                    const core = new THREE.Mesh(new THREE.SphereGeometry(1.8,32,32), new THREE.MeshPhongMaterial({color:0x100020, emissive: 0x200030, emissiveIntensity:0.4, transparent:true, opacity:0.85}));
                    mainObject.add(core);

                    const dustParticles = new THREE.BufferGeometry();
                    const dustCount = 1000; const dustPos = new Float32Array(dustCount * 3);
                    for(let i=0; i<dustCount*3; i++) dustPos[i] = (Math.random()-0.5)*30;
                    dustParticles.setAttribute('position', new THREE.BufferAttribute(dustPos,3));
                    const dustMat = new THREE.PointsMaterial({color:0x555577, size:0.08, transparent:true, opacity:0.6, depthWrite: false});
                    const dustSystem = new THREE.Points(dustParticles, dustMat);
                    mainObject.add(dustSystem);
                    
                    mainObject.userData.animate = (time) => { 
                        mainObject.rotation.y = time * 0.01; 
                        dustSystem.rotation.x = time * 0.005;
                    };
                    camera.position.set(0,2,defaultCameraZ + 3); camera.lookAt(mainObject.position);
                    if (DEBUG_MODE) console.log(`Pralaya created. Cam Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                    break;
                }
                case 'brahma_full_day': {
                     mainObject = new THREE.Group();
                     const sphereRadius = 3;
                     const sphereDay = new THREE.Mesh(
                        new THREE.SphereGeometry(sphereRadius,32,32, 0, Math.PI), 
                        new THREE.MeshStandardMaterial({color:0xFFB6C1, emissive:0xff8899, emissiveIntensity:0.4, side:THREE.DoubleSide, metalness:0.2, roughness:0.6})
                     );
                     sphereDay.rotation.y = Math.PI/2; mainObject.add(sphereDay);
                     const sphereNight = new THREE.Mesh(
                        new THREE.SphereGeometry(sphereRadius,32,32, 0, Math.PI), 
                        new THREE.MeshStandardMaterial({color:0x100020, emissive:0x200030, emissiveIntensity:0.4, side:THREE.DoubleSide, metalness:0.2, roughness:0.6})
                     );
                     sphereNight.rotation.y = -Math.PI/2; mainObject.add(sphereNight);
                     mainObject.userData.animate = (time) => { mainObject.rotation.y = time * 0.04; mainObject.rotation.x = time*0.01;};
                     camera.position.z = sphereRadius * 3.5; camera.lookAt(mainObject.position);
                     if (DEBUG_MODE) console.log(`Brahma Full Day created. Cam Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                     break;
                }
                case 'brahma_life': { 
                    mainObject = new THREE.Group();
                    const numCycles = 15;
                    for(let i=0; i<numCycles; i++) {
                        const cycleCore = new THREE.Mesh(new THREE.TorusKnotGeometry(0.5, 0.15, 64,8), new THREE.MeshPhongMaterial({
                            color: new THREE.Color().setHSL(i/numCycles, 0.7, 0.6),
                            emissive: new THREE.Color().setHSL(i/numCycles, 0.6, 0.4),
                            emissiveIntensity:0.5, shininess:60
                        }));
                        const angle = (i/numCycles) * Math.PI * 2; const radius = 4 + Math.sin(angle*3)*0.5;
                        cycleCore.position.set(Math.cos(angle)*radius, Math.sin(angle*2)*1, Math.sin(angle)*radius);
                        cycleCore.castShadow = true; mainObject.add(cycleCore);
                    }
                    mainObject.userData.animate = (time) => { 
                        mainObject.rotation.y = time * 0.015; 
                        mainObject.children.forEach((child,i) => {
                            child.rotation.x = time * (0.05 + i*0.002); child.rotation.z = time * (0.04 + i*0.003);
                        });
                    };
                    camera.position.set(0,3,defaultCameraZ + 2); camera.lookAt(mainObject.position);
                    if (DEBUG_MODE) console.log(`Brahma Life created. Cam Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                    break;
                }
                case 'mahavishnu': {
                    mainObject = new THREE.Group(); 
                    const vishnuRadius = 40; 
                    const vishnuGeo = new THREE.SphereGeometry(vishnuRadius, 32, 32); 
                    const vishnuMat = new THREE.ShaderMaterial({ 
                        uniforms: { time: { value: 0.0 }, color1: { value: new THREE.Color(0x0055ff) }, color2: { value: new THREE.Color(0x64ffda) } },
                        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                        fragmentShader: `uniform float time; uniform vec3 color1; uniform vec3 color2; varying vec2 vUv;
                            void main() {
                                float strength = smoothstep(0.4, 0.6, abs(vUv.y - 0.5 + sin(vUv.x * 5.0 + time * 0.1) * 0.1) * 2.0);
                                strength = pow(strength, 2.0);
                                vec3 color = mix(color1, color2, sin(vUv.x * 10.0 + time * 0.2) * 0.5 + 0.5);
                                gl_FragColor = vec4(color, strength * 0.3);
                            }`,
                        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side:THREE.BackSide
                    });
                    const vishnuForm = new THREE.Mesh(vishnuGeo, vishnuMat);
                    vishnuForm.position.y = - (vishnuRadius * 0.9); 
                    mainObject.add(vishnuForm);

                    const uniCount = 200; const uniPos = new Float32Array(uniCount * 3); 
                    const uniColors = new Float32Array(uniCount * 3); const uniSizes = new Float32Array(uniCount);
                    for (let i = 0; i < uniCount; i++) {
                        const i3 = i * 3;
                        uniPos[i3] = (Math.random() - 0.5) * 30; uniPos[i3 + 1] = (Math.random() - 0.5) * 20; uniPos[i3 + 2] = (Math.random() - 0.5) * 30 -10; 
                        const color = new THREE.Color().setHSL(Math.random(), 0.8, 0.7);
                        uniColors[i3] = color.r; uniColors[i3 + 1] = color.g; uniColors[i3 + 2] = color.b;
                        uniSizes[i] = Math.random() * 0.3 + 0.1;
                    }
                    const uniGeom = new THREE.BufferGeometry();
                    uniGeom.setAttribute('position', new THREE.BufferAttribute(uniPos, 3));
                    uniGeom.setAttribute('color', new THREE.BufferAttribute(uniColors, 3));
                    uniGeom.setAttribute('size', new THREE.BufferAttribute(uniSizes, 1));
                    
                    const uniMat = new THREE.ShaderMaterial({ 
                         uniforms: { pointTexture: { value: createStarTexture() } },
                        vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor;
                            void main() { vColor = color; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                                gl_PointSize = size * (200.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }`,
                        fragmentShader: `uniform sampler2D pointTexture; varying vec3 vColor;
                            void main() { gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord); if (gl_FragColor.a < 0.1) discard; }`,
                        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
                    });

                    const universes = new THREE.Points(uniGeom, uniMat); mainObject.add(universes);

                    mainObject.userData.animate = (time) => {
                        vishnuForm.material.uniforms.time.value = time; universes.rotation.y = time * 0.003;
                        const posAttr = universes.geometry.attributes.position;
                        for (let i = 0; i < uniCount; i++) {
                            posAttr.array[i * 3 + 1] += Math.sin(time * 0.3 + i * 0.8) * 0.005;
                            posAttr.array[i * 3 + 2] += 0.002; 
                            if(posAttr.array[i*3+2] > camera.position.z) posAttr.array[i*3+2] = -30 - Math.random()*10; 
                        }
                        posAttr.needsUpdate = true;
                    };
                    camera.position.z = defaultCameraZ + 13; 
                    camera.lookAt(mainObject.position);
                    if (DEBUG_MODE) console.log(`Mahavishnu created. Cam Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                    break;
                }
                default:
                    mainObject = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshStandardMaterial({ color: 0x11dd66, roughness: 0.4, emissive: 0x118833, emissiveIntensity: 0.4 }));
                    mainObject.castShadow = true;
                    mainObject.userData.animate = (time) => { mainObject.rotation.x = time * 0.1; mainObject.rotation.y = time * 0.1; };
                    camera.position.z = defaultCameraZ - 2; camera.lookAt(mainObject.position);
                    if (DEBUG_MODE) console.log(`Default scene object created. Cam Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
                    break;
            }
        } catch (e) {
            console.error(`Error during object creation for scene ${sceneId}:`, e);
            mainObject = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })); 
            camera.position.set(0,0,8); camera.lookAt(mainObject.position);
        }

        if (mainObject) {
            threeScene.add(mainObject);
            createdObjects.push(mainObject);
            if (DEBUG_MODE) console.log(`createSceneSpecificObjects - END for ${sceneId}. Main object added. Total objects in scene: ${threeScene.children.length}`);
        } else {
             if (DEBUG_MODE) console.error(`createSceneSpecificObjects - END for ${sceneId}. CRITICAL - No mainObject was defined or added.`);
        }
        return createdObjects;
    }

    function initScrollAnimations() {
        // ... (ScrollTrigger setup, make sure markers: DEBUG_MODE is enabled for testing) ...
        // Ensure the onEnter and onEnterBack callbacks include the robust resize and render logic for tlSceneData
        gsap.fromTo(heroSection.querySelectorAll('.reveal-text'),
            { opacity: 0, y: 60 },
            { opacity: 1, y: 0, duration: 1.2, stagger: 0.25, delay: 0.8, ease: "expo.out" }
        );

        const sections = gsap.utils.toArray('.timeline-section');
        if (DEBUG_MODE) console.log(`initScrollAnimations: Found ${sections.length} timeline sections.`);

        sections.forEach((section, index) => {
            const infoCard = section.querySelector('.info-card');
            const threeContainer = section.querySelector('.threejs-scene-container');
            const sceneId = section.dataset.sceneId;
            // Find the scene data from the potentially updated timelineScenes array
            const tlSceneData = timelineScenes.find(s => s.id === sceneId);

            if (!tlSceneData && DEBUG_MODE) {
                console.error(`initScrollAnimations: No timelineSceneData found for section ${section.id} (sceneId: ${sceneId})! This is a critical error. timelineScenes.length: ${timelineScenes.length}`);
                // Check if any scene in timelineScenes has this id, even if not initialized
                const placeholder = timelineScenes.find(s => s.id === sceneId);
                if(placeholder) console.log(`Placeholder for ${sceneId} exists but might not be initialized:`, placeholder.initialized);
                else console.log(`No placeholder for ${sceneId} found in timelineScenes array.`);
                // return; 
            } else if (tlSceneData && !tlSceneData.initialized && DEBUG_MODE) {
                 console.warn(`initScrollAnimations: tlSceneData for ${sceneId} found but NOT INITIALIZED. Animations might behave unexpectedly.`);
            }


            ScrollTrigger.create({
                trigger: section,
                start: "top center", 
                end: "bottom center", 
                // markers: DEBUG_MODE, 
                onEnter: () => {
                    if (DEBUG_MODE) console.log(`ScrollTrigger ON ENTER: section ${section.id}, Scene ID: ${tlSceneData ? tlSceneData.id : 'N/A (ERROR!)'}`);
                    gsap.to(infoCard, { opacity: 1, x: 0, duration: 0.9, ease: "power3.out" });
                    gsap.to(threeContainer, { opacity: 1, scale: 1, duration: 1.1, delay:0.1, ease: "elastic.out(1, 0.7)" });
                    if (tlSceneData && tlSceneData.initialized) { // Check if initialized
                        tlSceneData.isActive = true;
                        if (DEBUG_MODE) console.log(`Scene ${tlSceneData.id} isActive SET TO TRUE. Forcing resize & render.`);
                        if (tlSceneData.container && tlSceneData.camera && tlSceneData.renderer) {
                            if (tlSceneData.container.offsetParent !== null && tlSceneData.container.clientWidth > 0 && tlSceneData.container.clientHeight > 0) {
                                onTimelineSceneResize(tlSceneData.container, tlSceneData.camera, tlSceneData.renderer); 
                                requestAnimationFrame(() => { 
                                    if(tlSceneData.isActive) tlSceneData.renderer.render(tlSceneData.scene, tlSceneData.camera);
                                });
                            } else if(DEBUG_MODE){
                                console.warn(`ON ENTER: Scene ${tlSceneData.id} container NOT VISIBLE/SIZED (W:${tlSceneData.container.clientWidth}, H:${tlSceneData.container.clientHeight}). Cannot resize/render effectively.`);
                            }
                        } else if (DEBUG_MODE) {
                            console.error(`ON ENTER: Scene ${tlSceneData.id} missing critical components (container/camera/renderer).`);
                        }
                    } else if (DEBUG_MODE) {
                        console.warn(`ON ENTER: tlSceneData for ${section.id} not found or not initialized. Active state not set.`);
                    }
                    updateActiveDot(index);
                },
                onLeave: () => { 
                    if (DEBUG_MODE) console.log(`ScrollTrigger ON LEAVE: section ${section.id}, Scene ID: ${tlSceneData ? tlSceneData.id : 'N/A'}`);
                    gsap.to(infoCard, { opacity: 0, x: -60, duration: 0.7, ease: "power3.in" });
                    gsap.to(threeContainer, { opacity: 0, scale: 0.85, duration: 0.7, ease: "power3.in" });
                    if (tlSceneData && tlSceneData.initialized) {
                        tlSceneData.isActive = false;
                        if (DEBUG_MODE) console.log(`Scene ${tlSceneData.id} isActive SET TO FALSE`);
                    }
                },
                onEnterBack: () => {
                    if (DEBUG_MODE) console.log(`ScrollTrigger ON ENTER BACK: section ${section.id}, Scene ID: ${tlSceneData ? tlSceneData.id : 'N/A'}`);
                    gsap.to(infoCard, { opacity: 1, x: 0, duration: 0.9, ease: "power3.out" });
                    gsap.to(threeContainer, { opacity: 1, scale: 1, duration: 1.1, delay:0.1, ease: "elastic.out(1, 0.7)" });
                    if (tlSceneData && tlSceneData.initialized) {
                        tlSceneData.isActive = true;
                        if (DEBUG_MODE) console.log(`Scene ${tlSceneData.id} isActive SET TO TRUE (onEnterBack). Forcing resize & render.`);
                         if (tlSceneData.container && tlSceneData.camera && tlSceneData.renderer) {
                            if (tlSceneData.container.offsetParent !== null && tlSceneData.container.clientWidth > 0 && tlSceneData.container.clientHeight > 0) {
                                onTimelineSceneResize(tlSceneData.container, tlSceneData.camera, tlSceneData.renderer);
                                requestAnimationFrame(() => {
                                     if(tlSceneData.isActive) tlSceneData.renderer.render(tlSceneData.scene, tlSceneData.camera);
                                });
                            } else if(DEBUG_MODE){
                                console.warn(`ON ENTER BACK: Scene ${tlSceneData.id} container NOT VISIBLE/SIZED. Cannot resize/render effectively.`);
                            }
                        }  else if (DEBUG_MODE) {
                            console.error(`ON ENTER BACK: Scene ${tlSceneData.id} missing critical components.`);
                        }
                    } else if (DEBUG_MODE) {
                        console.warn(`ON ENTER BACK: tlSceneData for ${section.id} not found or not initialized. Active state not set.`);
                    }
                    updateActiveDot(index);
                },
                onLeaveBack: () => {
                    if (DEBUG_MODE) console.log(`ScrollTrigger ON LEAVE BACK: section ${section.id}, Scene ID: ${tlSceneData ? tlSceneData.id : 'N/A'}`);
                    gsap.to(infoCard, { opacity: 0, x: -60, duration: 0.7, ease: "power3.in" });
                    gsap.to(threeContainer, { opacity: 0, scale: 0.85, duration: 0.7, ease: "power3.in" });
                    if (tlSceneData && tlSceneData.initialized) {
                        tlSceneData.isActive = false;
                        if (DEBUG_MODE) console.log(`Scene ${tlSceneData.id} isActive SET TO FALSE (onLeaveBack)`);
                    }
                    if (index > 0) updateActiveDot(index - 1); else updateActiveDot(-1);
                }
            });
            gsap.set(infoCard, { opacity: 0, x: -60 });
            gsap.set(threeContainer, { opacity: 0, scale: 0.85 });
        });
        if (DEBUG_MODE) console.log("Scroll animations setup complete for timeline sections.");
    }


    function updateActiveDot(activeIndex) { /* ... (same) ... */ }

    const clock = new THREE.Clock();
    function animateTimelineScenes() {
        requestAnimationFrame(animateTimelineScenes);
        const elapsedTime = clock.getElapsedTime();
        const delta = clock.getDelta();

        for (let i = 0; i < timelineScenes.length; i++) {
            const tlScene = timelineScenes[i];
            // Crucially, check if it's initialized before trying to render
            if (tlScene.initialized && tlScene.isActive && tlScene.renderer && tlScene.scene && tlScene.camera) {
                if (DEBUG_MODE && Math.random() < 0.005) { /* ... (same logging) ... */ }
                try {
                    tlScene.objects.forEach(obj => {
                        if (obj && obj.userData && typeof obj.userData.animate === 'function') {
                            obj.userData.animate(elapsedTime, delta, tlScene);
                        }
                    });
                    tlScene.renderer.render(tlScene.scene, tlScene.camera);
                } catch (e) {
                    if(DEBUG_MODE) console.error(`Error rendering scene ${tlScene.id}:`, e);
                    tlScene.isActive = false; 
                    tlScene.initialized = false; // Mark as problematic
                }
            }
        }
    }

    loadContentAndInit();
    animateTimelineScenes();
});