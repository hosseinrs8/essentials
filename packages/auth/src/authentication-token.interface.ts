export type AuthenticationTokenPrivateDataRaw = [
  string,
  boolean,
  string,
  number,
];

export interface AuthenticationTokenPrivateDataInterface {
  secureDataHash: string;
  workspaceId?: string;
  otpSatisfy: boolean;
  createdAt: number;
}

export interface AuthenticationTokenPublicDataGeneralInterface {
  userId: string;
  workspaceId?: string;
}

export interface AuthenticationTokenPublicDataInterface
  extends AuthenticationTokenPublicDataNoWorkspaceInterface {
  workspaceId: string;
}

export interface AuthenticationTokenPublicDataNoWorkspaceInterface {
  userId: string;
  tokenId: string;
  workspaceId?: string;
}

export enum TokenProblem {
  signatureProblem,
  sessionProblem,
  workspaceProblem,
  userProblem,
  otpProblem,
}
