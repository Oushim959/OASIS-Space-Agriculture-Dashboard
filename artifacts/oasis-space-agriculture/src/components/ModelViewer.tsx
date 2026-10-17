import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type ModelViewerProps = {
  file: File;
  onError: (message: string) => void;
};

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    if (!mesh.material) return;

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

export default function ModelViewer({ file, onError }: ModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(true);

  onErrorRef.current = onError;

  useEffect(() => {
    setLoading(true);
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let animationFrame = 0;
    let model: THREE.Object3D | undefined;
    let renderer: THREE.WebGLRenderer | undefined;
    let controls: OrbitControls | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const fail = (error: unknown) => {
      if (disposed) return;
      setLoading(false);
      const details = error instanceof Error ? error.message : 'Unsupported or invalid model file.';
      onErrorRef.current(`Could not render this model: ${details}`);
    };

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
      camera.position.set(3.4, 2.4, 4.2);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.setAttribute('aria-label', 'Interactive 3D model preview');
      renderer.domElement.setAttribute('role', 'img');
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xd7f7ef, 0x1a2b38, 2));
      const keyLight = new THREE.DirectionalLight(0xe7ffff, 3);
      keyLight.position.set(4, 6, 5);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0x48d8bf, 1.5);
      fillLight.position.set(-5, 1, -4);
      scene.add(fillLight);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.minDistance = 0.3;
      controls.maxDistance = 30;
      controls.autoRotate = false;

      const resize = () => {
        if (!renderer || !mount) return;
        const width = Math.max(1, mount.clientWidth);
        const height = Math.max(1, mount.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      const animate = () => {
        if (disposed || !renderer || !controls) return;
        animationFrame = window.requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      file.arrayBuffer().then((buffer) => {
        if (disposed) return;
        const loader = new GLTFLoader();
        loader.parse(
          buffer,
          '',
          (gltf) => {
            if (disposed) {
              disposeObject(gltf.scene);
              return;
            }

            model = gltf.scene;
            model.scale.setScalar(1);
            const bounds = new THREE.Box3().setFromObject(model);
            const size = bounds.getSize(new THREE.Vector3());
            const largestDimension = Math.max(size.x, size.y, size.z);
            if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
              fail(new Error('The model has no visible geometry.'));
              return;
            }

            model.scale.setScalar(2.5 / largestDimension);
            const scaledBounds = new THREE.Box3().setFromObject(model);
            model.position.sub(scaledBounds.getCenter(new THREE.Vector3()));
            scene.add(model);
            controls?.target.set(0, 0, 0);
            camera.position.set(3.4, 2.4, 4.2);
            camera.lookAt(0, 0, 0);
            controls?.update();
            setLoading(false);
          },
          fail,
        );
      }).catch(fail);
    } catch (error) {
      fail(error);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      controls?.dispose();
      if (model) disposeObject(model);
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [file]);

  return (
    <div className="model-viewer" ref={mountRef} aria-busy={loading}>
      {loading && <span className="model-loading">Preparing local model preview…</span>}
    </div>
  );
}
