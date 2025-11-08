import { Box } from '@mui/material';
import CameraManagement from '../components/CameraManagement';
import Layout from '../components/Layout';
import { withAuth } from '../lib/withAuth';

function CameraPage() {
  return (
    <Layout>
      <CameraManagement />
    </Layout>
  );
}

export default withAuth(CameraPage);