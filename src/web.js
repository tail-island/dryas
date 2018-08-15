import 'babel-polyfill';
import {map, next} from 'lajure';
import * as T from 'three';

const EARTH_RADIUS = 6378136;
const SCALE_FACTOR = 1 / 0.0254 / 401;  // iPhone 8 Plusは401ppi。この式であっているのかはわかりませんけど。

(async () => {
  // カメラをキャプチャします。
  document.getElementById('video').srcObject = await navigator.mediaDevices.getUserMedia({audio: false,
                                                                                          video: {facingMode: {exact: 'environment'}}});

  // 座標系は、現在位置を中心とします。
  const originCoordinate = await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition((position) => {
      // resolve({latitude:  position.coords.latitude,
      //          longitude: position.coords.longitude,
      //          altitude:  0});  // 高度の誤差がやたらと大きかったので、とりあえず無視します。

      resolve(position.coords);
    });
  });

  // 半径。緯度が大きくなると半径が小さくなるので、軽度向けの半径も作成します。
  const radiusForLatitude  = EARTH_RADIUS;
  const radiusForLongitude = Math.cos(T.Math.degToRad(originCoordinate.latitude)) * radiusForLatitude;

  // 緯度経度高度を、ベクトルに変換します。
  const coordinateToVector = (coordinate) => {
    return new T.Vector3( T.Math.degToRad(coordinate.longitude - originCoordinate.longitude) * radiusForLongitude,
                          coordinate.altitude - originCoordinate.altitude,
                         -T.Math.degToRad(coordinate.latitude  - originCoordinate.latitude ) * radiusForLatitude);
  };

  const renderer = (() => {
    const result = new T.WebGLRenderer({canvas: document.getElementById('canvas'),
                                        alpha:  true});

    result.setPixelRatio(window.devicePixelRatio);
    result.setSize(480, 640);

    return result;
  })();

  const scene = (() => {
    const result = new T.Scene();

    // three.jsの単位はドットみたいなので、単位がメートルになるようにスケーリングします。
    result.scale.multiplyScalar(SCALE_FACTOR);

    return result;
  })();

  const camera = (() => {
    // てきとうに調べたら、iPhone 8の画角は75度と書いてありました。iPhone 8 Plusも同じでいいかなぁと。
    return new T.PerspectiveCamera(75, 480 / 640, 0.5 * SCALE_FACTOR, 1000 * SCALE_FACTOR);
  })();

  scene.add((() => {
    // とりあえず、本社の近くの道で。

    const vectors = Array.from(map(coordinateToVector, [{latitude: 35.661031, longitude: 139.794102, altitude: originCoordinate.altitude - 1.5},
                                                        {latitude: 35.661972, longitude: 139.792746, altitude: originCoordinate.altitude - 1.5},
                                                        {latitude: 35.661344, longitude: 139.791812, altitude: originCoordinate.altitude - 1.5},
                                                        {latitude: 35.659444, longitude: 139.792056, altitude: originCoordinate.altitude - 1.5}]));

    const curve = (() => {
      const result = new T.CurvePath();

      for (const curve of map((vector1, vector2) => new T.LineCurve3(vector1, vector2), vectors, next(vectors))) {
        result.add(curve);
      }

      return result;
    })();

    return new T.Mesh(new T.TubeGeometry(curve, 100, 2, 8), new T.MeshNormalMaterial());
  })());

  scene.add((() => {
    // 歩くのが大変だったので、簡単テスト用に自分の周囲10メートルの囲いも作ります。GPSの誤差のせいで、すぐに逃げていってしまいますけど。

    const curve = (() => {
      const result = new T.CurvePath();

      result.add(new T.LineCurve3(new T.Vector3( 10, -1.5, -10), new T.Vector3( 10, -1.5,  10)));
      result.add(new T.LineCurve3(new T.Vector3( 10, -1.5,  10), new T.Vector3(-10, -1.5,  10)));
      result.add(new T.LineCurve3(new T.Vector3(-10, -1.5,  10), new T.Vector3(-10, -1.5, -10)));

      return result;
    })();

    return new T.Mesh(new T.TubeGeometry(curve, 100, 0.5, 8, true), new T.MeshNormalMaterial());
  })());

  navigator.geolocation.watchPosition((position) => {
    console.log(position.coords);

    // camera.position.copy(coordinateToVector({latitude:  position.coords.latitude,
    //                                          longitude: position.coords.longitude,
    //                                          altitude:  0}));  // 高度の誤差がやたらと大きかったので、とりあえず無視します。

    camera.position.copy(coordinateToVector(position.coords));
  }, null, {enableHighAccuracy: true});

  window.addEventListener('deviceorientation', (() => {
    return (orientation) => {
      // TODO: 磁石の北と真北のズレを修正しなくていいのか確認する。

      camera.quaternion.setFromEuler(new T.Euler(T.Math.degToRad(orientation.beta), T.Math.degToRad(orientation.alpha), -T.Math.degToRad(orientation.gamma), 'YXZ'));
      camera.quaternion.multiply(new T.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)));  // X軸を中心に90度回転します。
    };
  })());

  const tick = () => {
    renderer.render(scene, camera);

    window.requestAnimationFrame(tick);
  };

  tick();
})();
