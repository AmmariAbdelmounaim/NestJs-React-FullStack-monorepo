import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginForm } from '@/features/auth/components/login-form';
import { RegisterForm } from '@/features/auth/components/register-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAuthToken } from '@/features/auth/lib/auth-storage';
import { usersControllerGetCurrentUser } from '@/api/generated/users/users';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const token = getAuthToken();

    // Only check authentication if token exists
    if (token) {
      let user;
      const response = await usersControllerGetCurrentUser();
      // Check if the response is successful (status 200)
      if ('data' in response && response.status === 200) {
        user = response.data;
      }

      if (user) {
        if (user.role === 'ADMIN') {
          throw redirect({
            to: '/admin',
          });
        } else if (user.role === 'USER') {
          throw redirect({
            to: '/user',
          });
        }
      }
    }
  },
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          <TabsContent value="register">
            <RegisterForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
