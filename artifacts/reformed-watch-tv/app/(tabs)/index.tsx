import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { TVHomeScreen } from "@/components/TVHomeScreen";
import { TVVideoDetailModal } from "@/components/TVVideoDetailModal";
import { useColors } from "@/hooks/useColors";
import type { Video } from "@/types";

export default function HomeScreen() {
  const colors = useColors();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TVHomeScreen onVideoSelect={setSelectedVideo} />
      <TVVideoDetailModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
