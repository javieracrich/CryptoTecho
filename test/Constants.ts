export class Constants {
  public static Week: number = 604_800;
  public static Day: number = 86_400;
  public static Month: number = 2_628_000;
  public static Year: number = 31_536_000;
}

export enum ContractStatus {
  NOTACTIVE,
  ACTIVE,
  CANCELLED,
}
