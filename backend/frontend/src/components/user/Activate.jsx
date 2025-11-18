import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const Activate = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/auth/users/activation/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, token }),
    })
      .then(async (res) => {
        setLoading(false);
        if (res.ok) {
          alert('Account activated successfully!');
          navigate('/login'); // Redirect to login page
        } else {
          const data = await res.json();
          console.error('Activation failed:', data);
          alert(`Activation failed: ${data?.detail || 'Unknown error'}`);
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error('Fetch error:', err);
        alert('Something went wrong. Check console for details.');
      });
  }, [uid, token, navigate]);

  return (
    <div>
      <h2>{loading ? 'Activating your account...' : 'Redirecting...'}</h2>
    </div>
  );
};

export default Activate;
