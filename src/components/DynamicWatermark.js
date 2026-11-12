import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Floating Dynamic Watermark Component
 * Prevents unauthorized recording via external cameras by continuously moving
 * student identification credentials across the screen.
 */
export default function DynamicWatermark({ studentName, studentPhone, studentId }) {
  const [position, setPosition] = useState({ top: 40, left: 20 });

  useEffect(() => {
    const interval = setInterval(() => {
      // Calculate random positions bounded within video player area
      const maxTop = Math.max(80, SCREEN_HEIGHT * 0.35);
      const maxLeft = Math.max(20, SCREEN_WIDTH - 220);

      const randomTop = Math.floor(Math.random() * (maxTop - 30)) + 30;
      const randomLeft = Math.floor(Math.random() * (maxLeft - 20)) + 20;

      setPosition({ top: randomTop, left: randomLeft });
    }, 6000); // Shift every 6 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.watermarkContainer,
        { top: position.top, left: position.left }
      ]}
    >
      <Text style={styles.watermarkText}>
        {studentName || 'طالب'} • {studentPhone || ''}
      </Text>
      <Text style={styles.watermarkSubText}>
        ID: #{studentId || '000'} • منصة مستر بولا
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  watermarkContainer: {
    position: 'absolute',
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  watermarkText: {
    color: 'rgba(255, 255, 255, 0.40)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  watermarkSubText: {
    color: 'rgba(255, 255, 255, 0.30)',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
});
