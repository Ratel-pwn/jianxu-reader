import React from 'react';
import Pdf from 'react-native-pdf';
import type { Book, Locator } from '../model/types';

export function PdfReader({ book, location, onPosition, onPages, onError }: { book: Book; location: Locator; onPosition: (locator: Locator) => void; onPages: (count: number) => void; onError: (message: string) => void }) {
  return <Pdf source={{ uri: book.originalUri, cache: false }} page={location.page || 1} horizontal={false} enablePaging={false} trustAllCerts={false} style={{ flex: 1, width: '100%' }}
    onLoadComplete={count => onPages(count)} onPageChanged={(page, count) => onPosition({ href: 'original.pdf', chapter: 0, page, progression: count > 1 ? (page - 1) / (count - 1) : 0 })}
    onError={() => onError('PDF 无法打开，可能已损坏或需要密码。当前版本不支持加密 PDF。')}/>;
}
