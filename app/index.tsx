import { View, StyleSheet, Text } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useNormalizedModel } from '@/hooks/useNormalizedModel';
import { Pressable } from 'react-native';

// Platform component
function Platform({ position, size = [3, 0.3, 1] }: { position: [number, number, number]; size?: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#8B4513" />
    </mesh>
  );
}

// Kangaroo player with charge-jump mechanics
function Kangaroo({ 
  chargeLevel,
  triggerJump,
  moveDirection
}: { 
  chargeLevel: number;
  triggerJump: number;
  moveDirection: number; // -1 for left, 0 for none, 1 for right
}) {
  const groupRef = useRef<THREE.Group>(null);
  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const isGroundedRef = useRef(true);
  const lastJumpTriggerRef = useRef(0);

  const kangaroo = useNormalizedModel(require('../assets/models/kangaroo.glb'), 1.5);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const gravity = -15;
    const moveSpeed = 3; // Horizontal movement speed
    
    // Check if jump was triggered
    if (triggerJump !== lastJumpTriggerRef.current && isGroundedRef.current) {
      lastJumpTriggerRef.current = triggerJump;
      // Jump strength based on charge (5 to 12 units)
      const jumpStrength = 5 + chargeLevel * 7;
      velocityRef.current.y = jumpStrength;
      isGroundedRef.current = false;
    }
    
    // Apply horizontal movement
    velocityRef.current.x = moveDirection * moveSpeed;
    
    // Apply gravity
    if (!isGroundedRef.current) {
      velocityRef.current.y += gravity * delta;
    }

    // Update position
    groupRef.current.position.x += velocityRef.current.x * delta;
    groupRef.current.position.y += velocityRef.current.y * delta;

    // Keep player within bounds
    const maxX = 6;
    if (groupRef.current.position.x > maxX) groupRef.current.position.x = maxX;
    if (groupRef.current.position.x < -maxX) groupRef.current.position.x = -maxX;

    // Ground collision detection
    const groundLevel = -2;
    if (groupRef.current.position.y <= groundLevel) {
      groupRef.current.position.y = groundLevel;
      velocityRef.current.y = 0;
      isGroundedRef.current = true;
    }

    // Platform collision detection
    const platforms = [
      { pos: [0, -2, 0], size: [8, 0.3, 1] },
      { pos: [-4, -0.5, 0], size: [3, 0.3, 1] },
      { pos: [3, 0.5, 0], size: [3, 0.3, 1] },
      { pos: [-2, 2, 0], size: [3, 0.3, 1] },
      { pos: [4, 3.5, 0], size: [3, 0.3, 1] },
      { pos: [0, 5, 0], size: [4, 0.3, 1] },
    ];

    platforms.forEach(platform => {
      const [px, py] = platform.pos;
      const [sx, sy] = platform.size;
      
      const playerX = groupRef.current!.position.x;
      const playerY = groupRef.current!.position.y;
      
      // Check if player is above platform and falling
      if (
        velocityRef.current.y <= 0 &&
        playerX > px - sx / 2 &&
        playerX < px + sx / 2 &&
        playerY > py &&
        playerY < py + sy + 0.5
      ) {
        groupRef.current!.position.y = py + sy;
        velocityRef.current.y = 0;
        isGroundedRef.current = true;
      }
    });

    // Bounce animation when on ground
    if (isGroundedRef.current && chargeLevel === 0) {
      const bounceAmount = Math.sin(state.clock.elapsedTime * 5) * 0.05;
      groupRef.current.position.y += bounceAmount;
    }

    // Squash effect when charging
    if (chargeLevel > 0 && isGroundedRef.current) {
      const squash = 1 - chargeLevel * 0.3;
      const stretch = 1 + chargeLevel * 0.15;
      groupRef.current.scale.set(stretch, squash, 1);
    } else {
      // Reset scale
      groupRef.current.scale.set(1, 1, 1);
    }

    // Tilt forward while jumping
    if (!isGroundedRef.current) {
      const tilt = Math.min(velocityRef.current.y / 10, 0.5);
      groupRef.current.rotation.x = -tilt;
    } else {
      groupRef.current.rotation.x = 0;
    }

    // Rotate to face movement direction
    if (moveDirection !== 0) {
      const targetRotation = moveDirection > 0 ? Math.PI / 2 : -Math.PI / 2;
      groupRef.current.rotation.y = targetRotation;
    }
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      <primitive object={kangaroo.scene} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}

// Main game component
function Game({ 
  chargeLevel, 
  triggerJump,
  moveDirection 
}: { 
  chargeLevel: number; 
  triggerJump: number;
  moveDirection: number;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      
      {/* Ground */}
      <Platform position={[0, -2, 0]} size={[8, 0.3, 1]} />
      
      {/* Platforms */}
      <Platform position={[-4, -0.5, 0]} size={[3, 0.3, 1]} />
      <Platform position={[3, 0.5, 0]} size={[3, 0.3, 1]} />
      <Platform position={[-2, 2, 0]} size={[3, 0.3, 1]} />
      <Platform position={[4, 3.5, 0]} size={[3, 0.3, 1]} />
      <Platform position={[0, 5, 0]} size={[4, 0.3, 1]} />
      
      {/* Kangaroo player */}
      <Kangaroo 
        chargeLevel={chargeLevel} 
        triggerJump={triggerJump}
        moveDirection={moveDirection}
      />

      {/* Background */}
      <mesh position={[0, 2, -5]}>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#87CEEB" />
      </mesh>
    </>
  );
}

export default function HomeScreen() {
  const [chargeLevel, setChargeLevel] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [triggerJump, setTriggerJump] = useState(0);
  const [moveDirection, setMoveDirection] = useState(0);
  const chargeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePressIn = () => {
    setIsPressing(true);
    setChargeLevel(0);
    
    // Gradually increase charge level
    chargeIntervalRef.current = setInterval(() => {
      setChargeLevel(prev => {
        if (prev >= 1) {
          return 1; // Max charge
        }
        return prev + 0.05; // Increase by 5% every 100ms
      });
    }, 100);
  };

  const handlePressOut = () => {
    setIsPressing(false);
    
    // Clear charging interval
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }

    // Trigger the jump with current charge level
    setTriggerJump(prev => prev + 1);

    // Reset charge after jump
    setTimeout(() => {
      setChargeLevel(0);
    }, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 2, 10], fov: 50 }}>
          <Game 
            chargeLevel={chargeLevel} 
            triggerJump={triggerJump}
            moveDirection={moveDirection}
          />
        </Canvas>
      </View>
      
      {/* Charge meter */}
      <View style={styles.chargeMeterContainer}>
        <Text style={styles.chargeMeterLabel}>Jump Power</Text>
        <View style={styles.chargeMeterBg}>
          <View 
            style={[
              styles.chargeMeterFill, 
              { 
                width: `${chargeLevel * 100}%`,
                backgroundColor: chargeLevel < 0.5 ? '#FFA500' : chargeLevel < 0.8 ? '#FF6B00' : '#FF0000'
              }
            ]} 
          />
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        {/* Left button */}
        <Pressable
          style={({ pressed }) => [
            styles.moveButton,
            pressed && styles.moveButtonPressed,
          ]}
          onPressIn={() => setMoveDirection(-1)}
          onPressOut={() => setMoveDirection(0)}
        >
          <Text style={styles.moveButtonText}>← LEFT</Text>
        </Pressable>

        {/* Jump button */}
        <Pressable
          style={({ pressed }) => [
            styles.jumpButton,
            pressed && styles.jumpButtonPressed,
            isPressing && styles.jumpButtonCharging
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Text style={styles.jumpButtonText}>
            {isPressing ? 'JUMP!' : 'HOLD'}
          </Text>
        </Pressable>

        {/* Right button */}
        <Pressable
          style={({ pressed }) => [
            styles.moveButton,
            pressed && styles.moveButtonPressed,
          ]}
          onPressIn={() => setMoveDirection(1)}
          onPressOut={() => setMoveDirection(0)}
        >
          <Text style={styles.moveButtonText}>RIGHT →</Text>
        </Pressable>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          🦘 Use LEFT/RIGHT to move, HOLD to charge jump!
        </Text>
        <Text style={styles.instructionText}>
          Try to reach the highest platform!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasContainer: {
    width: '100%',
    height: '60%',
  },
  chargeMeterContainer: {
    width: '80%',
    marginTop: 20,
    marginBottom: 20,
  },
  chargeMeterLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  chargeMeterBg: {
    width: '100%',
    height: 30,
    backgroundColor: '#333',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#666',
  },
  chargeMeterFill: {
    height: '100%',
    backgroundColor: '#00ff00',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  moveButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 25,
    paddingVertical: 20,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#42A5F5',
    minWidth: 100,
    alignItems: 'center',
  },
  moveButtonPressed: {
    backgroundColor: '#1976D2',
    transform: [{ scale: 0.95 }],
  },
  jumpButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#66BB6A',
    minWidth: 120,
    alignItems: 'center',
  },
  jumpButtonPressed: {
    backgroundColor: '#45a049',
    transform: [{ scale: 0.95 }],
  },
  jumpButtonCharging: {
    backgroundColor: '#FF9800',
    borderColor: '#FFB74D',
  },
  jumpButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  moveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructions: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    maxWidth: '90%',
  },
  instructionText: {
    color: '#a0a0a0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
});
