import { ShopSettings } from "../types";
import { storageService } from "./storageService";

class SettingsService {
  public getSettings(): ShopSettings {
    return storageService.getSettings();
  }

  public updateSettings(settings: ShopSettings): ShopSettings {
    storageService.saveSettings(settings);
    return settings;
  }

  public resetToDemoData(): void {
    storageService.resetAllData();
  }

  public exportData(): string {
    return storageService.exportAllData();
  }

  public importData(jsonString: string): boolean {
    return storageService.importAllData(jsonString);
  }
}

export const settingsService = new SettingsService();
