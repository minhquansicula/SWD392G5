import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('AIVES App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const AivesApp());
    expect(find.byType(AivesApp), findsOneWidget);
  });
}
