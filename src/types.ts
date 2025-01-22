export interface TimeSlot {
    start: Date;
    end: Date;
}

export interface BlacklistRequest {
    user_id: string;
  }
  
  export interface BlacklistResponse {
    message: string;
  }
  
  export interface RemoveBlacklistResponse {
    message: string;
  }