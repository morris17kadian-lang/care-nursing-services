import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Linking } from 'react-native';
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

const toTimeLabel = (value, { fallback = '' } = {}) => {
  const d = coerceToDate(value);
  if (!d) return fallback;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Reusable accordion list styled like AdminClientsScreen "Medical Notes" cards.
 *
 * items: Array<{ id: string, date?: string|Date, title: string, subtitle?: string, body?: string }>
 */
export default function NotesAccordionList({
  items,
  emptyText = 'No notes yet',
  showTime = false,
  onPhotoPress,
}) {
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
        const dateObj = coerceToDate(date);
        const epochMs = dateObj ? dateObj.getTime() : 0;
        const photoUrls = Array.isArray(raw?.photoUrls)
          ? raw.photoUrls.filter((uri) => typeof uri === 'string' && uri.trim().length > 0)
          : [];
        return { id, title, subtitle, body, date, photoUrls, epochMs, __index: index };
      })
      .filter(Boolean);
  }, [items]);

  const sorted = useMemo(() => {
    const list = Array.isArray(normalized) ? [...normalized] : [];
    list.sort((a, b) => {
      const aTime = typeof a?.epochMs === 'number' ? a.epochMs : 0;
      const bTime = typeof b?.epochMs === 'number' ? b.epochMs : 0;
      if (aTime !== bTime) return bTime - aTime; // newest first
      const aIndex = typeof a?.__index === 'number' ? a.__index : 0;
      const bIndex = typeof b?.__index === 'number' ? b.__index : 0;
      return aIndex - bIndex;
    });
    return list;
  }, [normalized]);

  if (sorted.length === 0) {
    return (
      <View style={styles.emptyRow}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {sorted.map((item) => {
        const expanded = expandedId === item.id;
        return (
          <View key={item.id} style={styles.card}>
            <TouchableWeb
              style={styles.header}
              onPress={() => setExpandedId(expanded ? null : item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.headerLeft}>
                <View style={styles.headerTopRow}>
                  <MaterialCommunityIcons name="note-text" size={16} color={COLORS.primary} />
                  <Text style={styles.dateText} numberOfLines={1} ellipsizeMode="tail">
                    {toDateLabel(item.date, { showTime: false })}
                  </Text>
                </View>
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
                  {showTime ? <Text style={styles.timeText}>{toTimeLabel(item.date)}</Text> : null}
                </View>
                <Text style={styles.bodyText}>{item.body || emptyText}</Text>
                {Array.isArray(item.photoUrls) && item.photoUrls.length > 0 ? (
                  <View style={styles.photosSection}>
                    <Text style={styles.photosLabel}>Photos</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.photosList}
                    >
                      {item.photoUrls.map((uri, index) => (
                        <TouchableWeb
                          key={`${item.id}-photo-${index}`}
                          onPress={() => {
                            const target = String(uri || '').trim();
                            if (!target) return;
                            if (typeof onPhotoPress === 'function') {
                              onPhotoPress(target);
                              return;
                            }
                            Linking.openURL(target).catch(() => {});
                          }}
                          activeOpacity={0.8}
                        >
                          <Image source={{ uri }} style={styles.photoThumb} />
                        </TouchableWeb>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
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
    flex: 1,
    gap: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
    flexShrink: 1,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.success,
    marginLeft: 6,
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
  photosSection: {
    marginTop: 10,
  },
  photosLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 6,
  },
  photosList: {
    gap: 8,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
});
