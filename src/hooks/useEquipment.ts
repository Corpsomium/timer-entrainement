import { useCallback, useEffect, useState } from 'react';
import type { Bar, EquipmentInventory, Kettlebell, Plate } from '../types/equipment';
import { createDefaultInventory } from '../utils/equipmentDefaults';
import { loadEquipment, saveEquipment } from '../utils/storage';

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useEquipment() {
  const [inventory, setInventory] = useState<EquipmentInventory>(() => loadEquipment());

  useEffect(() => {
    saveEquipment(inventory);
  }, [inventory]);

  const resetToDefault = useCallback(() => {
    setInventory(createDefaultInventory());
  }, []);

  const upsertBar = useCallback((bar: Omit<Bar, 'id'> & { id?: string }) => {
    setInventory((prev) => {
      const id = bar.id || newId('bar');
      const next: Bar = { ...bar, id, quantity: Math.max(1, bar.quantity || 1) };
      const idx = prev.bars.findIndex((b) => b.id === id);
      const bars = [...prev.bars];
      if (idx >= 0) bars[idx] = next;
      else bars.push(next);
      return { ...prev, bars };
    });
  }, []);

  const removeBar = useCallback((id: string) => {
    setInventory((prev) => ({ ...prev, bars: prev.bars.filter((b) => b.id !== id) }));
  }, []);

  const upsertPlate = useCallback((plate: Omit<Plate, 'id'> & { id?: string }) => {
    setInventory((prev) => {
      const id = plate.id || newId('plate');
      const next: Plate = {
        ...plate,
        id,
        quantity: Math.max(0, plate.quantity || 0),
      };
      const idx = prev.plates.findIndex((p) => p.id === id);
      const plates = [...prev.plates];
      if (idx >= 0) plates[idx] = next;
      else plates.push(next);
      plates.sort((a, b) => a.weightKg - b.weightKg);
      return { ...prev, plates };
    });
  }, []);

  const removePlate = useCallback((id: string) => {
    setInventory((prev) => ({ ...prev, plates: prev.plates.filter((p) => p.id !== id) }));
  }, []);

  const upsertKettlebell = useCallback((kb: Omit<Kettlebell, 'id'> & { id?: string }) => {
    setInventory((prev) => {
      const id = kb.id || newId('kb');
      const next: Kettlebell = { ...kb, id, quantity: Math.max(1, kb.quantity || 1) };
      const idx = prev.kettlebells.findIndex((k) => k.id === id);
      const kettlebells = [...prev.kettlebells];
      if (idx >= 0) kettlebells[idx] = next;
      else kettlebells.push(next);
      kettlebells.sort((a, b) => a.weightKg - b.weightKg);
      return { ...prev, kettlebells };
    });
  }, []);

  const removeKettlebell = useCallback((id: string) => {
    setInventory((prev) => ({
      ...prev,
      kettlebells: prev.kettlebells.filter((k) => k.id !== id),
    }));
  }, []);

  return {
    inventory,
    resetToDefault,
    upsertBar,
    removeBar,
    upsertPlate,
    removePlate,
    upsertKettlebell,
    removeKettlebell,
  };
}
