
var queryplanner = require("../lib/queryplanner")
  , v = require("../lib/variable")
  , SortJoinStream = require("../lib/sortjoinstream")
  , JoinStream = require("../lib/joinstream");

describe("query planner", function() {

  var db, query, planner, stub, expected;

  function buildBefore(algorithm) {

    beforeEach(function() {
      db = {
        approximateSize: function() {}
      };
      stub = sinon.stub(db, "approximateSize");
      planner = queryplanner(db, { joinAlgorithm: algorithm });
    });
  }

  describe("with basic algorithm", function() {

    buildBefore("basic");

    it("should return a single condition as-is", function(done) {
      query = [ { predicate: "friend" } ];
      expected = [ { predicate: "friend", stream: JoinStream } ];

      stub
        .withArgs("pos::friend::", "pos::friend\xff", sinon.match.func)
        .yields(null, 10);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it("should order two conditions based on their size", function(done) {
      query = [{
          subject: "matteo"
        , predicate: "friend"
      }, {
          predicate: "friend"
      }];

      expected = [{
          subject: "matteo"
        , predicate: "friend"
        , stream: JoinStream
      }, {
          predicate: "friend"
        , stream: JoinStream
      }];

      stub
        .withArgs("pos::friend::", "pos::friend\xff")
        .yields(null, 10);

      stub
        .withArgs("pso::friend::matteo::", "pso::friend::matteo\xff")
        .yields(null, 1);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it("should order two conditions based on their size (bis)", function(done) {
      query = [{
          predicate: "friend"
      }, {
          subject: "matteo"
        , predicate: "friend"
      }];

      expected = [{
          subject: "matteo"
        , predicate: "friend"
        , stream: JoinStream
      }, {
          predicate: "friend"
        , stream: JoinStream
      }];

      db.approximateSize
        .withArgs("pos::friend::", "pos::friend\xff")
        .yields(null, 10);

      db.approximateSize
        .withArgs("pso::friend::matteo::", "pso::friend::matteo\xff")
        .yields(null, 1);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it("should avoid variables", function(done) {
      query = [ { predicate: "friend", subject: v("x") } ];
      expected = [ { predicate: "friend", subject: v("x"), stream: JoinStream } ];

      stub
        .withArgs("pos::friend::", "pos::friend\xff", sinon.match.func)
        .yields(null, 10);

      planner(query, function(err, result) {
        expect(result).to.eql(query);
        done();
      });
    });
  });

  describe("with sort algorithm", function() {

    buildBefore("sort");

    it("should return a single condition with the JoinStream", function(done) {
      query = [ { predicate: "friend" } ];
      expected = [ { predicate: "friend", stream: JoinStream } ];

      stub
        .withArgs("pos::friend::", "pos::friend\xff", sinon.match.func)
        .yields(null, 10);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it("should use the same index if there is a possible matching", function(done) {
      query = [{
          subject: "matteo"
        , predicate: "friend"
      }, {
          predicate: "friend"
      }];

      expected = [{
          subject: "matteo"
        , predicate: "friend"
        , stream: JoinStream
        , index: "pso"
      }, {
          predicate: "friend"
        , stream: SortJoinStream
        , index: "pso"
      }];

      stub
        .withArgs("pos::friend::", "pos::friend\xff")
        .yields(null, 10);

      stub
        .withArgs("pso::friend::matteo::", "pso::friend::matteo\xff")
        .yields(null, 1);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it("should put the second condition in the same order as the first", function(done) {
      query = [{
          subject: v("x")
        , predicate: "friend"
        , object: v("c")
      }, {
          subject: v("x")
        , predicate: "abc"
        , object: v("c")
      }];
      
      expected = [{
          subject: v("x")
        , predicate: "friend"
        , object: v("c")
        , stream: JoinStream
        , index: "pos"
      }, {
          subject: v("x")
        , predicate: "abc"
        , object: v("c")
        , stream: SortJoinStream
        , index: "pos"
      }];

      stub
        .withArgs("pos::friend::", "pos::friend\xff", sinon.match.func)
        .yields(null, 1);

      stub
        .withArgs("pos::abc::", "pos::abc\xff", sinon.match.func)
        .yields(null, 10);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });
  });
});
