const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!url || !url.includes('cifraclub.com')) {
      setError('Por favor, introduce una URL válida de Cifra Club.');
      return;
    }
    setIsLoading(true);

    try {
      // ¡EL CAMBIO CLAVE! Enviamos la URL como texto plano.
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/scrape`, {
        method: 'POST',
        headers: {
          // Le decimos explícitamente al servidor que estamos enviando texto.
          'Content-Type': 'text/plain',
        },
        body: url, // Enviamos la cadena de texto de la URL directamente.
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || 'Algo salió mal.');
      }
      
      onSongAdded(responseData);
      setSuccess(`¡"${responseData.title}" ha sido añadida!`);
      setUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
};