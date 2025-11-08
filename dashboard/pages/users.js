import { Box } from '@mui/material';
import UserManagement from '../components/UserManagement';
import Layout from '../components/Layout';
import { withAuth } from '../lib/withAuth';

function UsersPage() {
  return (
    <Layout>
      <UserManagement />
    </Layout>
  );
}

export default withAuth(UsersPage);