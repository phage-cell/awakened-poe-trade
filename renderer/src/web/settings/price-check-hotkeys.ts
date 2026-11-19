import type { PriceCheckWidget } from '@/web/overlay/interfaces'
import { _configModelValue } from './utils'

export function priceCheckHotkeys (priceCheckWidget: PriceCheckWidget) {
  return {
    translationKey: 'price_check.name',
    items: [{
      translationKey: 'price_check.hotkey',
      config: {
        modKey: _configModelValue(priceCheckWidget, 'hotkeyHold'),
        nonModKey: _configModelValue(priceCheckWidget, 'hotkey')
      }
    }, {
      translationKey: 'price_check.hotkey_locked',
      config: _configModelValue(priceCheckWidget, 'hotkeyLocked')
    }]
  }
}
