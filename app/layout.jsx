export const metadata = {
  title: 'USD/KRW 환율 알림',
  description: '실시간 환율 모니터링 및 알림 서비스',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
