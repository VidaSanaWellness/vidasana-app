import * as ImagePicker from 'expo-image-picker';

export type LanguageCode = 'en' | 'es' | 'fr';

export type EventUnifiedImage = {
  id: string;
  type: 'existing' | 'new';
  uri: string;
  file?: ImagePicker.ImagePickerAsset;
};

export type TicketType = {
  id?: string;
  name: string;
  price: string;
  capacity: string;
};

export type EventFormValues = {
  translations: {
    [key in LanguageCode]: {
      title: string;
      description: string;
    };
  };
  category: number | null;
  start_at: Date | null;
  end_at: Date | null;
  book_till: Date | null;
  images: EventUnifiedImage[];
  ticket_types: TicketType[];
};
