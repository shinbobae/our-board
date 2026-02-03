import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { io, Socket } from 'socket.io-client';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. 소켓 연결
    socketRef.current = io('http://localhost:4000');

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('서버에 연결되었습니다!');
    });

    // 서버에서 다른 유저가 그린 선 데이터 받기
    socketRef.current.on('receive-path', async (pathData) => {
      console.log('다른 유저 선 수신!');

      try {
        const objects = await fabric.util.enlivenObjects([pathData]);
        objects.forEach((obj) => {
          const fabricObj = obj as fabric.FabricObject;
          fabricObj.set({
            selectable: false,
            evented: false,
          });
          fabricCanvasRef.current?.add(fabricObj);
        });
        // 화면 갱신 (반드시 추가)
        fabricCanvasRef.current?.renderAll();
      } catch (err) {
        console.error('실패:', err);
      }

      //  JSON -> Fabric
      fabric.util.enlivenObjects(
        [pathData],
        (objects: fabric.Object[]) =>
          objects.forEach((obj) => {
            // 내가 그리는 선과 겹치지 않도록 설정 (선택사항)
            obj.set({ selectable: false, evented: false });
            fabricCanvasRef.current?.add(obj);
            fabricCanvasRef.current?.renderAll();
          }),
        'fabric',
      );
    });

    // 2. Fabric 캔버스 초기화
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        isDrawingMode: true, // 처음부터 그리기 모드 활성화
      });

      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = 5;
      canvas.freeDrawingBrush.color = '#000000';

      fabricCanvasRef.current = canvas;

      // 선 그리기 완료 서버 전송
      canvas.on('path:created', (e) => {
        const pathJSON = e.path.toJSON();
        console.log('전송할 pathJSON: ', pathJSON);
        socketRef.current?.emit('send-path', pathJSON);
      });
    }

    return () => {
      socketRef.current?.disconnect();
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current?.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#e0e0e0',
        minHeight: '100vh',
      }}
    >
      <h2>실시간 화이트보드 🎨 {isConnected ? '🟢 연결됨' : '🔴 연결 안됨'}</h2>
      <div style={{ border: '2px solid #333', display: 'inline-block' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default App;
