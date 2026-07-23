import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Sheet } from '@/components/form';
import { Card } from '@/components/ui';
import { tapLight, tapSuccess } from '@/lib/haptics';
import {
  generateTemplateCsv,
  ImportResult,
  mapRowsToGearItems,
  parseCsvText,
  parseWorkbookRows,
} from '@/lib/importGear';
import { font, useTheme } from '@/theme/tokens';
import { useGearStore } from '@/store/useGearStore';

type Props = { visible: boolean; onClose: () => void };

function downloadTemplate() {
  if (typeof document === 'undefined') return; // native -- no filesystem download UI here
  const blob = new Blob([generateTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gearpro-import-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ImportGearSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const categories = useGearStore((s) => s.categories);
  const addCategory = useGearStore((s) => s.addCategory);
  const addGear = useGearStore((s) => s.addGear);

  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setResult(null);
    setFileError('');
    setBusy(false);
  };

  const pickFile = async () => {
    setFileError('');
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'text/csv',
        'text/comma-separated-values',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
      copyToCacheDirectory: true,
      base64: false,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];

    setBusy(true);
    try {
      const res = await fetch(asset.uri);
      const buffer = await res.arrayBuffer();
      const isCsv = /\.csv$/i.test(asset.name) || asset.mimeType?.includes('csv');
      const rows = isCsv ? parseCsvText(new TextDecoder().decode(buffer)) : parseWorkbookRows(buffer);
      if (rows.length < 2) {
        setFileError('No rows found. Make sure the first row is the header.');
        setBusy(false);
        return;
      }
      setResult(mapRowsToGearItems(rows, categories));
    } catch {
      setFileError("Couldn't read that file. Try the CSV template if you're not sure of the format.");
    }
    setBusy(false);
  };

  const confirmImport = () => {
    if (!result) return;
    result.newCategories.forEach((c) => addCategory(c));
    result.valid.forEach((item) => addGear(item));
    tapSuccess();
    reset();
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import gear">
      {!result ? (
        <>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginBottom: 16 }}>
            Import a CSV or Excel file of your gear. Columns: Brand, Item Name, Category, Weight (lb),
            Quantity, Notes, Expiration.
          </Text>

          <Pressable
            onPress={() => {
              tapLight();
              downloadTemplate();
            }}
            style={{ marginBottom: 10 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: t.border,
                paddingVertical: 13,
              }}>
              <Ionicons name="download-outline" size={18} color={t.text} />
              <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>Download CSV template</Text>
            </View>
          </Pressable>

          <Button
            label={busy ? 'Reading file…' : 'Choose file to import'}
            onPress={pickFile}
            icon={<Ionicons name="cloud-upload-outline" size={18} color={t.onPrimary} />}
          />

          {fileError ? (
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginTop: 12 }}>
              {fileError}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Card style={{ padding: 14, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="checkmark-circle" size={22} color={t.primary} />
              <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>
                {result.valid.length} item{result.valid.length === 1 ? '' : 's'} ready to import
              </Text>
            </View>
            {result.newCategories.length > 0 ? (
              <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 8 }}>
                New categories will be added: {result.newCategories.join(', ')}
              </Text>
            ) : null}
          </Card>

          {result.valid.slice(0, 30).map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: i === Math.min(result.valid.length, 30) - 1 ? 0 : 1,
                borderColor: t.border,
              }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.text }}>
                  {item.brand ? `${item.brand} ` : ''}
                  {item.name}
                </Text>
                <Text style={{ fontFamily: font.medium, fontSize: 11, color: t.textMuted, marginTop: 1 }}>
                  {item.category} · {item.weightLb.toFixed(2)} lb · qty {item.quantity}
                </Text>
              </View>
            </View>
          ))}
          {result.valid.length > 30 ? (
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 6 }}>
              …and {result.valid.length - 30} more.
            </Text>
          ) : null}

          {result.skipped.length > 0 ? (
            <Card style={{ padding: 12, marginTop: 14, backgroundColor: t.alertSoft, borderColor: t.alertSoft }}>
              <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.alertText, marginBottom: 4 }}>
                {result.skipped.length} row{result.skipped.length === 1 ? '' : 's'} skipped
              </Text>
              {result.skipped.slice(0, 10).map((s, i) => (
                <Text key={i} style={{ fontFamily: font.medium, fontSize: 12, color: t.alertText }}>
                  Row {s.row}: {s.reason}
                </Text>
              ))}
            </Card>
          ) : null}

          <View style={{ height: 16 }} />
          <Button label={`Import ${result.valid.length} item${result.valid.length === 1 ? '' : 's'}`} onPress={confirmImport} />
          <View style={{ height: 8 }} />
          <Button label="Choose a different file" tone="ghost" onPress={reset} />
        </>
      )}
    </Sheet>
  );
}
