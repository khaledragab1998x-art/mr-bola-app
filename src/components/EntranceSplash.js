import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

/**
 * Enhanced Branded Entrance Splash Component
 * Provides a cinematic, royal physics loading experience using the typography logo.
 */
export default function EntranceSplash({ message = 'Preparing Learning Platform...' }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo breathing animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );

    // Halo glow animation
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.9,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );

    // Text fade in
    Animated.timing(textFadeAnim, {
      toValue: 1,
      duration: 800,
      delay: 200,
      useNativeDriver: true,
    }).start();

    pulseLoop.start();
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Background Decorative Cosmic Glows */}
      <Animated.View style={[styles.haloGlow, { opacity: glowAnim }]} />
      <Animated.View style={[styles.secondaryGlow, { opacity: glowAnim }]} />

      {/* Central Typography Logo with Breathing Animation */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Slogan & Physics Details */}
      <Animated.View style={[styles.textContainer, { opacity: textFadeAnim }]}>
        <View style={styles.badgeRow}>
          <Ionicons name="sparkles" size={14} color={colors.gold} />
          <Text style={styles.badgeText}>Mr.Poula Malak - Physics</Text>
          <Ionicons name="sparkles" size={14} color={colors.gold} />
        </View>

        <Text style={styles.tagline}>Master Physics with Deep Understanding</Text>

        {/* Loading Spinner & Status */}
        <View style={styles.loadingWrap}>
          <View style={styles.loadingDot} />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  haloGlow: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    backgroundColor: 'rgba(2, 132, 199, 0.22)',
    filter: Platform.OS === 'web' ? 'blur(40px)' : undefined,
  },
  secondaryGlow: {
    position: 'absolute',
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: (width * 0.55) / 2,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    filter: Platform.OS === 'web' ? 'blur(30px)' : undefined,
  },
  logoContainer: {
    width: Math.min(width * 0.78, 320),
    height: Math.min(width * 0.58, 240),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 24,
    marginBottom: 12,
  },
  badgeText: {
    color: colors.goldLight,
    fontSize: 12,
    fontWeight: 'bold',
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 26,
    textAlign: 'center',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
