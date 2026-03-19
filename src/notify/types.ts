export interface ReleaseChange {
  packageName: string;
  tag: string;
  oldVersion: string | null;
  newVersion: string;
}

export interface ReleaseEvent {
  title: string;
  isDigest: boolean;
  changes: ReleaseChange[];
  installCommand: string;
  schnorrWarning?: {
    oldClassId: string;
    newClassId: string;
  };
}

export interface NotificationSink {
  name: string;
  send(event: ReleaseEvent): Promise<void>;
}
