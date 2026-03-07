import { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { ErrorLogTab } from '../components/ErrorLogTab.js';

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return (
    <Box role="tabpanel" sx={{ pt: 3 }}>
      {children}
    </Box>
  );
}

export function AdminPage() {
  const [tabIndex, setTabIndex] = useState(1);

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', p: 3 }}>
      <Typography
        variant="h5"
        component="h1"
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontWeight: 600,
          color: '#12111A',
          mb: 2,
        }}
      >
        Admin
      </Typography>

      <Tabs
        value={tabIndex}
        onChange={(_e, newValue: number) => {
          setTabIndex(newValue);
        }}
        aria-label="Admin tabs"
        sx={{
          '& .MuiTab-root.Mui-selected': {
            color: '#8027FF',
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#8027FF',
          },
        }}
      >
        <Tab label="Users" />
        <Tab label="Error Log" />
      </Tabs>

      <TabPanel value={tabIndex} index={0}>
        <Typography
          sx={{ color: '#6B6D82', fontSize: '0.875rem', fontFamily: '"DM Sans", sans-serif' }}
        >
          User management coming soon
        </Typography>
      </TabPanel>

      <TabPanel value={tabIndex} index={1}>
        <ErrorLogTab />
      </TabPanel>
    </Box>
  );
}
