// Test...
const { Context } = require('../../src/ioc/Context');
const { Lifecycle } = require('../../src/ioc/Lifecycle');
const { BaseSingletonDefinition } = require('../../src/ioc/objectdefinition/BaseSingletonDefinition');
const demand = require('must');

class A {
  constructor(val) {
    // console.log('Instantiating A');
    this.val = val;
  }
}

class B {
  constructor(a) {
    // console.log('Instantiating B');
    this.a = a;
  }
  shutdown() {
    // console.log('Shutting down instance of B');
  }
}

class TrackSingleton {
  static clear() {
    TrackSingleton.initialised = false;
  }
  static mark() {
    TrackSingleton.initialised = true;
  }
  static isInitialised() {
    return TrackSingleton.initialised;
  }
  constructor() {
    TrackSingleton.mark();
  }
}
TrackSingleton.clear();

describe('ioc/Context', () => {
  describe('inheritance', () => {
    it('starting the child context starts the parent context', function* () {
      const parentContext = new Context('parent context');
      const childContext = new Context('child context', parentContext);
      yield childContext.lcStart();
      childContext.getStatus().must.be.equal(Lifecycle.STATES.STARTED);
      parentContext.getStatus().must.be.equal(Lifecycle.STATES.STARTED);
      yield childContext.lcStop();
    });
    it('stopping the child context stops the parent context', function* () {
      const parentContext = new Context('parent context');
      const childContext = new Context('child context', parentContext);
      yield childContext.lcStart();
      yield childContext.lcStop();
      childContext.getStatus().must.be.equal(Lifecycle.STATES.STOPPED);
      parentContext.getStatus().must.be.equal(Lifecycle.STATES.STOPPED);
    });
    it('Parent objects are available in the child context', function* () {
      const parentContext = new Context('parent context');
      parentContext.registerSingletons(A);
      const childContext = new Context('child context', parentContext);
      yield childContext.lcStart();
      const a = yield childContext.getObjectByName('A');
      demand(a).is.not.falsy();
      a.must.be.instanceOf(A);
      yield childContext.lcStop();
    });
  });
  describe('Lazyness', () => {
    it('lazy objects are not initialised during context start', function* () {
      TrackSingleton.clear();
      const myContext = new Context('test1');
      myContext.registerSingletons(TrackSingleton);
      yield myContext.lcStart();
      TrackSingleton.isInitialised().must.be.false();
      yield myContext.lcStop();
    });
    it('non-lazy objects are initialised during context start', function* () {
      TrackSingleton.clear();
      const myContext = new Context('test1');
      myContext.registerSingletons(TrackSingleton);
      myContext.getDefinitionByName('TrackSingleton').withLazyLoading(false);
      yield myContext.lcStart();
      TrackSingleton.isInitialised().must.be.true();
      yield myContext.lcStop();
    });
  });
  describe('individual bean options', function* () {
    const myContext = new Context('test1');
    myContext.registerSingletons(A);
    yield myContext.lcStart();
    it('can get a bean', () => {
      myContext.getObjectByName('A').must.not.be.undefined();
    });
    it('can get a bean by type', () => {
      myContext.getObjectByType('A').must.not.be.undefined();
    });
    it('can get a bean by type multi', function* () {
      const beans = yield* myContext.getObjectsByType('A');
      beans.must.be.array();
      beans.length.must.be.equal(1);
    });
    it('the bean is a singleton', function* () {
      const bean = yield* myContext.getObjectByName('A');
      bean.val = 15;
      const bean2 = yield* myContext.getObjectByName('A');
      bean2.val.must.be.equal(15);
    });
    yield myContext.lcStop();
  });
  describe('beans with constructor args', () => {
    it('can use value constructor arguments', function* () {
      const myContext = new Context('test1');
      myContext.registerSingletons(new BaseSingletonDefinition(A).constructorParamByValue('the value'));
      yield myContext.lcStart();
      const a = yield* myContext.getObjectByName('A');
      a.must.not.be.undefined();
      a.val.must.be.equal('the value');
      yield myContext.lcStop();
    });
    it('can use reference constructor arguments', function* () {
      const myContext = new Context('test1');
      myContext.registerSingletons(new BaseSingletonDefinition(A).constructorParamByValue('the value'));
      myContext.registerSingletons(new BaseSingletonDefinition(B).constructorParamByRef('A'));
      yield myContext.lcStart();
      const a = yield* myContext.getObjectByName('A');
      const b = yield* myContext.getObjectByName('B');
      a.must.not.be.undefined();
      b.must.not.be.undefined();
      b.a.must.be.equal(a);
      yield myContext.lcStop();
    });
    it('can use type constructor arguments', function* () {
      const myContext = new Context('test1');
      myContext.registerSingletons(new BaseSingletonDefinition(A).constructorParamByValue('the value'));
      myContext.registerSingletons(new BaseSingletonDefinition(B).constructorParamByType('A'));
      yield myContext.lcStart();
      const a = yield* myContext.getObjectByName('A');
      const b = yield* myContext.getObjectByName('B');
      a.must.not.be.undefined();
      b.must.not.be.undefined();
      b.a.must.be.equal(a);
      yield myContext.lcStop();
    });
  });
  describe('beans with parameters set', () => {
    it('can use value params', function* () {
      const myContext = new Context('test1');
      myContext.registerSingletons(new BaseSingletonDefinition(A).setPropertyByValue('val', 'the value'));
      yield myContext.lcStart();
      const a = yield* myContext.getObjectByName('A');
      a.must.not.be.undefined();
      a.val.must.be.equal('the value');
      yield myContext.lcStop();
    });
    it('can use reference params', function* () {
      const myContext = new Context('test1');
      myContext.registerSingletons(new BaseSingletonDefinition(A).constructorParamByValue('the value'));
      myContext.registerSingletons(new BaseSingletonDefinition(B).setPropertyByRef('a', 'A'));
      yield myContext.lcStart();
      const a = yield* myContext.getObjectByName('A');
      const b = yield* myContext.getObjectByName('B');
      a.must.not.be.undefined();
      b.must.not.be.undefined();
      b.a.must.be.equal(a);
      yield myContext.lcStop();
    });
    it('can use type params', function* () {
      const myContext = new Context('test1');
      myContext.registerSingletons(new BaseSingletonDefinition(A).constructorParamByValue('the value'));
      myContext.registerSingletons(new BaseSingletonDefinition(B).setPropertyByType('a', 'A'));
      yield myContext.lcStart();
      const a = yield* myContext.getObjectByName('A');
      const b = yield* myContext.getObjectByName('B');
      a.must.not.be.undefined();
      b.must.not.be.undefined();
      b.a.must.be.equal(a);
      yield myContext.lcStop();
    });
  });
  describe('wiring', () => {
    it('can manage circular dependencies', function* () {
      const myContext = new Context('test1');
      myContext.registerSingletons(new BaseSingletonDefinition(A).constructorParamByRef('B'));
      myContext.registerSingletons(new BaseSingletonDefinition(B).setPropertyByRef('a', 'A'));
      yield myContext.lcStart();
      const a = yield* myContext.getObjectByName('A');
      const b = yield* myContext.getObjectByName('B');
      a.must.not.be.undefined();
      b.must.not.be.undefined();
      b.a.must.be.equal(a);
      a.val.must.be.equal(b);
      yield myContext.lcStop();
    });
    it('throws an exception when the circular dependency is in the constructor', function* () {
      const myContext = new Context('test1');
      myContext.registerSingletons(new BaseSingletonDefinition(A).constructorParamByRef('B'));
      myContext.registerSingletons(new BaseSingletonDefinition(B).constructorParamByRef('A'));
      yield myContext.lcStart();
      try {
        yield* myContext.getObjectByName('A');
        '1'.must.equal('2'); // Fail
      } catch (e) {
        // console.log('There was an exception');
        e.must.be.an.error(/Circular dependency detected/);
      } finally {
        yield myContext.lcStop();
      }
    });
  });
  describe('cloning', () => {
    it('throws an exception when in any state other than NOT_STARTED', function* () {
      const myContext = new Context('test1');
      yield myContext.lcStart();

      try {
        myContext.clone();
        '1'.must.equal('2'); // Fail
      } catch (e) {
        e.must.be.an.error(/Operation requires state to be/);
      } finally {
        yield myContext.lcStop();
      }
    });
    it('clones all object definitions', function* () {
      const myContext = new Context('test1');
      myContext.registerSingletons(new BaseSingletonDefinition(A).constructorParamByValue('the value'));

      const clonedContext = myContext.clone('test2');

      myContext.lcStart();
      clonedContext.lcStart();

      const a = yield* myContext.getObjectByName('A');
      const copyA = yield* clonedContext.getObjectByName('A');

      a.must.not.be.undefined();
      copyA.must.not.be.undefined();
      copyA.must.be.an.instanceOf(A);
      a.val.must.be.equal(copyA.val);

      myContext.lcStop();
      clonedContext.lcStop();
    });
  });
  describe('importContext', () => {
    it('throws an exception when in any state other than NOT_STARTED', function* () {
      const myContext = new Context('test1');
      const otherContext = new Context('other_context');

      yield myContext.lcStart();

      try {
        myContext.importContext(otherContext);
        '1'.must.equal('2'); // Fail
      } catch (e) {
        e.must.be.an.error(/Operation requires state to be/);
      } finally {
        yield myContext.lcStop();
      }
    });
    it('copies new object definitions into current context', function* () {
      const otherContext = new Context('other_context');
      otherContext.registerSingletons(new BaseSingletonDefinition(A).constructorParamByValue('the value'));

      const myContext = new Context('test1');

      myContext.importContext(otherContext);

      myContext.lcStart();
      otherContext.lcStart();

      const a = yield* myContext.getObjectByName('A');

      a.must.not.be.undefined();
      a.val.must.be.equal('the value');

      myContext.lcStop();
      otherContext.lcStop();
    });
    it('overwrites an object definition in the current context', function* () {
      const otherContext = new Context('other_context');
      otherContext.registerSingletons(new BaseSingletonDefinition(A).constructorParamByValue('X'));

      const myContext = new Context('test1');
      myContext.registerSingletons(new BaseSingletonDefinition(A).constructorParamByValue('A'));

      myContext.importContext(otherContext, true);

      myContext.lcStart();
      otherContext.lcStart();

      const a = yield* myContext.getObjectByName('A');

      a.must.not.be.undefined();
      a.val.must.be.equal('X');

      myContext.lcStop();
      otherContext.lcStop();
    });
  });
}
);
