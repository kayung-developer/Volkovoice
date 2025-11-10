import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import useSWR, { useSWRConfig } from 'swr';
import { Bot, Plus, Play, Trash2, Edit } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import toast from 'react-hot-toast/native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UploadModal from '../components/voice-clones/UploadModal'; // We will create this
import CloneStatusBadge from '../components/voice-clones/CloneStatusBadge'; // We will create this

const fetcher = (url: string, apiClient: any) => apiClient.get(url).then((res: any) => res.data);

// Individual item in the list
const VoiceCloneItem = ({ item }: { item: any }) => {
    const { theme } = useTheme();
    // In a real app, you'd implement rename/delete/preview logic here
    const handlePreview = () => toast('Preview coming soon!');
    const handleRename = () => toast('Rename coming soon!');
    const handleDelete = () => toast('Delete coming soon!');

    return (
        <Animated.View
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(300)}
            style={[styles.itemContainer, { backgroundColor: theme.card, shadowColor: theme.black }]}
        >
            <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.primary }]}>{item.clone_name}</Text>
                <Text style={[styles.itemDate, { color: theme.textSecondary }]}>
                    Created: {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>
            <View style={styles.itemActions}>
                <CloneStatusBadge status={item.status} />
                {item.status === 'completed' && (
                     <View style={styles.actionButtons}>
                        <TouchableOpacity onPress={handlePreview} style={styles.iconButton}><Play color={theme.textSecondary} size={20} /></TouchableOpacity>
                        <TouchableOpacity onPress={handleRename} style={styles.iconButton}><Edit color={theme.textSecondary} size={20} /></TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete} style={styles.iconButton}><Trash2 color={theme.error} size={20} /></TouchableOpacity>
                    </View>
                )}
            </View>
        </Animated.View>
    );
};


const VoiceClonesScreen = () => {
  const { theme } = useTheme();
  const { apiClient } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate } = useSWRConfig();

  const { data: clones, error, isLoading } = useSWR('/api/voice-clone/', (url) => fetcher(url, apiClient), {
    refreshInterval: (latestData) => {
        const isTraining = latestData?.some((clone: any) => ['training', 'pending'].includes(clone.status.toLowerCase()));
        return isTraining ? 10000 : 0;
    }
  });

  const onRefresh = useCallback(() => {
    mutate('/api/voice-clone/');
  }, [mutate]);

  const handleUploadSuccess = () => {
    toast.success("Upload successful! Your voice is training.");
    mutate('/api/voice-clone/');
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
        <Bot size={80} color={theme.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Your Studio is Empty</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Tap the '+' button to create your first AI voice clone.
        </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>Voice Clone Studio</Text>

      {isLoading && !clones ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      ) : error ? (
        <Text style={{ color: theme.error, textAlign: 'center', marginTop: 50 }}>Failed to load voices.</Text>
      ) : (
        <FlatList
          data={clones}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <VoiceCloneItem item={item} />}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={theme.primary} />}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setIsModalOpen(true)}
        activeOpacity={0.8}
      >
        <Plus size={30} color={theme.white} />
      </TouchableOpacity>

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 32,
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 100, // Position above the main tab bar
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '40%',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 30,
  },
  itemContainer: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  itemInfo: {
    marginBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
  },
  itemDate: {
    fontSize: 12,
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    padding: 5,
  },
});

export default VoiceClonesScreen;