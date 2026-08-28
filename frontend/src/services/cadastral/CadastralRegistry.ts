/**
 * CadastralRegistry
 *
 * Central registry that manages cadastral data providers.
 * The verification engine queries the registry instead of directly
 * importing sampleProperty.ts.
 *
 * Provider resolution order:
 *  1. ExternalCadastralProvider (if connected)
 *  2. MockCadastralProvider (fallback)
 */

import type {
  ICadastralProvider,
  ProviderStatus,
  CadastralFloorRecord,
  CadastralParcelRecord,
} from '../../types/cadastral';
import { MockCadastralProvider } from './MockCadastralProvider';
import { ExternalCadastralProvider } from './ExternalCadastralProvider';

export interface RegistryStatus {
  activeProviderId: string;
  activeProviderName: string;
  activeProviderStatus: ProviderStatus;
  externalProviderStatus: ProviderStatus;
  mockProviderStatus: ProviderStatus;
}

class CadastralRegistryImpl {
  private mockProvider: MockCadastralProvider;
  private externalProvider: ExternalCadastralProvider;

  constructor() {
    this.mockProvider = new MockCadastralProvider();
    this.externalProvider = new ExternalCadastralProvider();
  }

  /** Returns the best available provider (external if connected, mock otherwise) */
  private getActiveProvider(): ICadastralProvider {
    if (this.externalProvider.getStatus() === 'EXTERNAL_CONNECTED') {
      return this.externalProvider;
    }
    return this.mockProvider;
  }

  getStatus(): RegistryStatus {
    const active = this.getActiveProvider();
    return {
      activeProviderId: active.id,
      activeProviderName: active.name,
      activeProviderStatus: active.getStatus(),
      externalProviderStatus: this.externalProvider.getStatus(),
      mockProviderStatus: this.mockProvider.getStatus(),
    };
  }

  getParcelRecord(parcelId: string): CadastralParcelRecord | null {
    const active = this.getActiveProvider();
    const result = active.getParcelRecord(parcelId);
    if (result) return result;
    // Fallback to mock if external returned null
    if (active !== this.mockProvider) {
      return this.mockProvider.getParcelRecord(parcelId);
    }
    return null;
  }

  getFloorRecord(ulpinOrFloorId: string): CadastralFloorRecord | null {
    const active = this.getActiveProvider();
    const result = active.getFloorRecord(ulpinOrFloorId);
    if (result) return result;
    if (active !== this.mockProvider) {
      return this.mockProvider.getFloorRecord(ulpinOrFloorId);
    }
    return null;
  }
}

/** Singleton instance */
export const CadastralRegistry = new CadastralRegistryImpl();
