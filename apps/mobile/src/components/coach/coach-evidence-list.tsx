import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@elev9/ui';

import type { CoachEvidence } from '../../hooks/coach';

type CoachEvidenceListProps = {
  evidence: CoachEvidence[];
  title?: string;
  maxItems?: number;
};

export const CoachEvidenceList = memo(function CoachEvidenceList({
  evidence,
  maxItems = 3,
  title = 'Supporting Evidence',
}: CoachEvidenceListProps) {
  if (evidence.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.list}>
        {evidence.slice(0, maxItems).map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="ellipse" size={8} color="#111827" />
            </View>
            <View style={styles.copy}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {item.detail ? (
                <Text style={styles.itemDetail}>{item.detail}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    color: '#111827',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  iconWrap: {
    width: 18,
    alignItems: 'center',
    paddingTop: 6,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  itemDetail: {
    color: '#5b6472',
    fontSize: 13,
    lineHeight: 18,
  },
});
