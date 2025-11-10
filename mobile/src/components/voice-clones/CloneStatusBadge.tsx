import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Cpu, CheckCircle, AlertTriangle, LucideProps } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

interface CloneStatusBadgeProps {
  status: string;
}

const CloneStatusBadge: React.FC<CloneStatusBadgeProps> = ({ status }) => {
  const { theme } = useTheme();

  const statusConfig: {
    [key: string]: {
      text: string;
      icon: React.FC<LucideProps>;
      color: string;
      backgroundColor: string;
    };
  } = {
    pending: {
      text: 'Pending',
      icon: Clock,
      color: theme.warning,
      backgroundColor: theme.warning + '20',
    },
    training: {
      text: 'Training',
      icon: Cpu,
      color: theme.info,
      backgroundColor: theme.info + '20',
    },
    completed: {
      text: 'Ready',
      icon: CheckCircle,
      color: theme.success,
      backgroundColor: theme.success + '20',
    },
    failed: {
      text: 'Failed',
      icon: AlertTriangle,
      color: theme.error,
      backgroundColor: theme.error + '20',
    },
  };

  const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <Icon color={config.color} size={14} />
      <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  }