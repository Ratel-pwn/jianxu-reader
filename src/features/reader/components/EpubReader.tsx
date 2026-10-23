import React, { useEffect, useState } from 'react';
import { File } from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { View } from 'react-native';
import { Busy, ErrorMessage } from '../../../components/ui';
import { readerHtml } from '../model/readerHtml';
import { isLocator, type Book, type Locator, type Typography } from '../model/types';

type Props = { book: Book; location: Locator; typography: Typography; onPosition: (location: Locator) => void; onSelection: (quote: string, location: Locator) => void; onLink: (href: string) => void };
export function EpubReader({ book, location, typography, onPosition, onSelection, onLink }: Props) {
  const [html, setHtml] = useState(''), [error, setError] = useState(''), [loadedHtml, setLoadedHtml] = useState('');
  const loading = !error && (!html || loadedHtml !== html);
  useEffect(() => {
    let active = true;
    new File(book.directory, `chapter-${location.chapter}.html`).text().then(content => { if (active) { setError(''); setHtml(readerHtml(content, book.chapters[location.chapter].href, location.chapter, location, typography)); } }).catch(() => { if (active) setError('章节读取失败，请重新导入这本书'); });
    return () => { active = false; };
  }, [book, location, typography]);
  return <View style={{ flex: 1 }}>{error ? <ErrorMessage message={error}/> : !!html && <WebView
    source={{ html, baseUrl: 'about:blank' }} style={{ flex: 1, backgroundColor: 'transparent' }} originWhitelist={['about:blank']} javaScriptEnabled
    allowFileAccess={false} allowUniversalAccessFromFileURLs={false} allowFileAccessFromFileURLs={false} mixedContentMode="never"
    setSupportMultipleWindows={false} sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} domStorageEnabled={false}
    onShouldStartLoadWithRequest={request => request.url === 'about:blank'}
    onContentProcessDidTerminate={() => setError('阅读视图已关闭，请返回书库重新打开')}
    onError={() => setError('阅读视图加载失败')}
    onMessage={event => {
      try {
        if (event.nativeEvent.data.length > 5000) return;
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === 'ready') setLoadedHtml(html);
        if (message.type === 'position' && isLocator(message.locator) && message.locator.chapter === location.chapter && message.locator.href === book.chapters[location.chapter].href) onPosition(message.locator);
        if (message.type === 'selection' && typeof message.quote === 'string' && message.quote.length <= 500 && isLocator(message.locator) && message.locator.chapter === location.chapter && message.locator.href === book.chapters[location.chapter].href) onSelection(message.quote, message.locator);
        if (message.type === 'link' && typeof message.href === 'string') onLink(message.href);
      } catch { /* Ignore malformed content messages. */ }
    }}/>} {loading && <View style={{ position: 'absolute', top: 0, right: 0, left: 0 }} pointerEvents="none"><Busy message="正在打开章节…"/></View>}</View>;
}
