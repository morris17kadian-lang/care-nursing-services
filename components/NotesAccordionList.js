import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import TouchableWeb from './TouchableWeb';

const normalizeString = (value) => {
  if (!value) return null;
  if (typeof value !== 'string') return String(value);
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const coerceToDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  // Firestore Timestamp
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    }

    const seconds =
      typeof value.seconds === 'number'
        ? value.seconds
        : typeof value._seconds === 'number'
          ? value._seconds
          : null;
    if (typeof seconds === 'number' && Number.isFinite(seconds)) {
      const d = new Date(seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  // Epoch millis/seconds
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      const ms = asNumber < 1e12 ? asNumber * 1000 : asNumber;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toDateLabel = (value, { fallback = 'No date', showTime = false } = {}) => {
  const d = coerceToDate(value);
  if (!d) return fallback;
  if (!showTime) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Reusable accordion list styled like AdminClientsScreen "Medical Notes" cards.
 *
 * items: Array<{ id: string, date?: string|Date, title: string, subtitle?: string, body?: string }>
 */
export default function NotesAccordionList({ items, emptyText = 'No notes yet', showTime = false }) {
  const [expandedId, setExpandedId] = useState(null);

  const normalized = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return list
      .map((raw, index) => {
        const id = normalizeString(raw?.id) || `note-${index}`;
        const title = normalizeString(raw?.title) || 'Note';
        const subtitle = normalizeString(raw?.subtitle);
        const body = normalizeString(raw?.body);
        const date = raw?.date || null;
        return { id, title, subtitle, body, date };
      })
      .filter(Boolean);
  }, [items]);

  if (normalized.length === 0) {
    return (
      <View style={styles.emptyRow}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {normalized.map((item) => {
        const expanded = expandedId === item.id;
        return (
          <View key={item.id} style={styles.card}>
            <TouchableWeb
              style={styles.header}
              onPress={() => setExpandedId(expanded ? null : item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.headerLeft}>
                <MaterialCommunityIcons name="note-text" size={16} color={COLORS.primary} />
                <Text style={styles.dateText}>{toDateLabel(item.date, { showTime })}</Text>
              </View>
              <MaterialCommunityIcons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableWeb>

            {expanded ? (
              <View style={styles.body}>
                <View style={[styles.titleRow, { marginBottom: 8 }]}>
                  <Text style={styles.title}>{item.title}</Text>
                  {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
                </View>
                <Text style={styles.bodyText}>{item.body || emptyText}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  emptyRow: {
    paddingVertical: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: COLORS.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 10,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  body: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.success,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  bodyText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 16,
  },
});
