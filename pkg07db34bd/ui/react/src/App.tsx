/*
 * BoilerConnect routes (Lane A owns this file). Every page is pre-registered so lanes never need to edit it:
 *   /                    HomePage         (Lane C)
 *   /post/:postId        PostDetailPage   (Lane D)
 *   /inbox               InboxPage        (Lane D)
 *   /messages            DmMessagesPage   (Lane D)
 *   /messages/:convId    DmMessagesPage   (Lane D — open a conversation)
 *   /profile[/:memberId] ProfilePage      (Lane D)
 */
import { Navigate, Route, Routes } from 'react-router';
import { PersonaProvider } from '@/components/Persona/PersonaContext';
import { ShellLayout } from '@/components/Shell/ShellLayout';
import { HomePage } from '@/pages/Home/HomePage';
import { PostDetailPage } from '@/pages/Post/PostDetailPage';
import { InboxPage } from '@/pages/Inbox/InboxPage';
import { DmMessagesPage } from '@/pages/Messages/DmMessagesPage';
import { ProfilePage } from '@/pages/Profile/ProfilePage';

export function App() {
  return (
    <PersonaProvider>
      <Routes>
        <Route element={<ShellLayout />}>
          <Route index element={<HomePage />} />
          <Route path="post/:postId" element={<PostDetailPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="messages" element={<DmMessagesPage />} />
          <Route path="messages/:conversationId" element={<DmMessagesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:memberId" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </PersonaProvider>
  );
}

export default App;
