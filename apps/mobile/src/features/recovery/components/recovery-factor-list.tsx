import type { RecoveryExperienceFactor } from '@elev9/types';
import { SectionHeader } from '@elev9/ui';
import { StyleSheet, View } from 'react-native';

import { RecoveryFactorRow } from './recovery-factor-row';

export function RecoveryFactorList({
  factors,
}: {
  factors: RecoveryExperienceFactor[];
}) {
  return (
    <View style={styles.section}>
      <SectionHeader
        title="What influenced your result"
        subtitle="These signals help explain today’s guidance."
      />
      {factors.length === 0 ? (
        <RecoveryFactorEmpty />
      ) : (
        factors.map((factor) => <RecoveryFactorRow key={factor.key} factor={factor} />)
      )}
    </View>
  );
}

function RecoveryFactorEmpty() {
  return <SectionHeader title="No factor details available" />;
}

const styles = StyleSheet.create({ section: { gap: 12 }, });

