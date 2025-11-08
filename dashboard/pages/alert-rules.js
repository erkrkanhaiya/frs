import { Box } from '@mui/material';
import AlertRules from '../components/AlertRules';
import Layout from '../components/Layout';
import { withAuth } from '../lib/withAuth';

function AlertRulesPage() {
  return (
    <Layout>
      <AlertRules />
    </Layout>
  );
}

export default withAuth(AlertRulesPage);